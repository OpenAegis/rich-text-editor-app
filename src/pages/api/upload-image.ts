// @ts-ignore
import formidable from 'formidable';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import { saleorApp } from '@/saleor-app';

const FILE_UPLOAD_MUTATION = `
  mutation FileUpload($file: Upload!) {
    fileUpload(file: $file) {
      uploadedFile {
        url
        contentType
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: 0, message: 'Method not allowed' });
  }

  try {
    console.log('GraphQL upload request received');
    
    // 获取认证信息
    let saleorApiUrl = req.headers['saleor-api-url'] as string;
    let authorizationHeader = req.headers['authorization'] as string;
    let authData;
    let receivedToken;

    // 方案1: 标准Saleor Dashboard认证（有认证头）
    if (saleorApiUrl && authorizationHeader) {
      console.log('Using Saleor Dashboard authentication');
      receivedToken = authorizationHeader.replace('Bearer ', '');
      
      try {
        authData = await saleorApp.apl.get(saleorApiUrl);
        if (!authData) {
          return res.status(401).json({
            success: 0,
            message: 'No authentication data found for this Saleor instance'
          });
        }
      } catch (error) {
        console.error('Failed to get auth data:', error);
        return res.status(500).json({
          success: 0,
          message: 'Failed to verify authentication'
        });
      }
    } else {
      // 方案2: 直接API访问（使用存储的认证数据）
      console.log('Using direct API access, trying to get stored auth data');
      
      try {
        const allAuthData = await saleorApp.apl.getAll();
        const authEntries = Object.entries(allAuthData);
        
        if (authEntries.length > 0) {
          const [firstSaleorApiUrl, firstAuthData] = authEntries[0];
          authData = firstAuthData;
          saleorApiUrl = firstSaleorApiUrl;
          receivedToken = authData.token;
          console.log('Using first available auth data from FileAPL');
        } else {
          return res.status(401).json({
            success: 0,
            message: 'No authentication data available'
          });
        }
      } catch (error: any) {
        // UpstashAPL不支持getAll，尝试使用环境变量
        console.log('APL does not support getAll, trying environment fallback');
        
        const defaultSaleorUrl = process.env.SALEOR_API_URL || 'https://api.lzsm.shop/graphql/';
        
        try {
          authData = await saleorApp.apl.get(defaultSaleorUrl);
          if (authData) {
            saleorApiUrl = defaultSaleorUrl;
            receivedToken = authData.token;
            console.log('Using stored auth data from UpstashAPL');
          } else {
            return res.status(401).json({
              success: 0,
              message: 'No authentication data found'
            });
          }
        } catch (aplError) {
          return res.status(500).json({
            success: 0,
            message: 'Failed to retrieve authentication data'
          });
        }
      }
    }

    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    
    if (!file) {
      return res.status(400).json({ 
        success: 0, 
        message: 'No file uploaded' 
      });
    }

    console.log('File details:', {
      originalFilename: file.originalFilename,
      mimetype: file.mimetype,
      size: file.size
    });

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype || '')) {
      return res.status(400).json({ 
        success: 0, 
        message: 'Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.' 
      });
    }

    // 使用Saleor GraphQL文件上传
    const tokenToUse = authData?.token || receivedToken;
    console.log('Uploading to Saleor via GraphQL...');

    // 创建FormData for GraphQL multipart upload
    const FormData = require('form-data');
    const formData = new FormData();
    
    // 添加GraphQL操作
    formData.append('operations', JSON.stringify({
      query: FILE_UPLOAD_MUTATION,
      variables: {
        file: null
      }
    }));
    
    // 添加文件映射
    formData.append('map', JSON.stringify({
      "0": ["variables.file"]
    }));
    
    // 添加文件
    const fileStream = fs.createReadStream(file.filepath);
    formData.append('0', fileStream, {
      filename: file.originalFilename || 'image',
      contentType: file.mimetype
    });

    // 发送到Saleor GraphQL
    const uploadResponse = await fetch(saleorApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenToUse}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log('Saleor upload response status:', uploadResponse.status);
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Saleor upload failed:', errorText);
      return res.status(uploadResponse.status).json({
        success: 0,
        message: `Saleor upload failed: ${uploadResponse.status}`
      });
    }

    const result = await uploadResponse.json();
    console.log('Saleor upload result:', result);

    // 清理临时文件
    fs.unlinkSync(file.filepath);

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return res.status(400).json({ 
        success: 0, 
        message: 'File upload failed',
        errors: result.errors
      });
    }

    if (result.data?.fileUpload?.errors && result.data.fileUpload.errors.length > 0) {
      return res.status(400).json({ 
        success: 0, 
        message: 'File upload failed',
        errors: result.data.fileUpload.errors
      });
    }

    if (!result.data?.fileUpload?.uploadedFile?.url) {
      return res.status(400).json({ 
        success: 0, 
        message: 'Upload succeeded but no URL returned'
      });
    }

    // 返回EditorJS期望的格式
    res.status(200).json({
      success: 1,
      file: {
        url: result.data.fileUpload.uploadedFile.url
      }
    });

  } catch (error) {
    console.error('Upload error details:', error);
    res.status(500).json({ 
      success: 0, 
      message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};