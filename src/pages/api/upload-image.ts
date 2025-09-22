// @ts-ignore
import formidable from 'formidable';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import { saleorApp } from '@/saleor-app';

// First check what mutations are available
const CHECK_SCHEMA_QUERY = `
query {
  __schema {
    mutationType {
      fields {
        name
        description
      }
    }
  }
}`;

// Try different upload mutations
const FILE_UPLOAD_MUTATIONS = {
  fileUpload: `
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
  `,
  
  uploadFile: `
    mutation UploadFile($file: Upload!) {
      uploadFile(file: $file) {
        url
        errors {
          field
          message
          code
        }
      }
    }
  `,
  
  mediaCreate: `
    mutation MediaCreate($input: MediaInput!) {
      mediaCreate(input: $input) {
        media {
          url
          type
        }
        errors {
          field
          message
          code
        }
      }
    }
  `
};

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
        console.log('Trying to get auth data for URL:', defaultSaleorUrl);
        
        try {
          authData = await saleorApp.apl.get(defaultSaleorUrl);
          if (authData) {
            saleorApiUrl = defaultSaleorUrl;
            receivedToken = authData.token;
            console.log('Using stored auth data from UpstashAPL:', {
              hasToken: !!authData.token,
              tokenPrefix: authData.token ? authData.token.substring(0, 10) + '...' : 'none'
            });
          } else {
            console.log('No auth data found for URL:', defaultSaleorUrl);
            return res.status(401).json({
              success: 0,
              message: 'No authentication data found'
            });
          }
        } catch (aplError) {
          console.error('APL error:', aplError);
          return res.status(500).json({
            success: 0,
            message: 'Failed to retrieve authentication data',
            details: aplError instanceof Error ? aplError.message : 'Unknown error'
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

    // First, check what mutations are available
    console.log('Checking available mutations...');
    const schemaResponse = await fetch(saleorApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenToUse}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: CHECK_SCHEMA_QUERY
      })
    });
    
    if (schemaResponse.ok) {
      const schemaResult = await schemaResponse.json();
      console.log('Schema response:', schemaResult);
      const mutations = schemaResult.data?.__schema?.mutationType?.fields?.map((f: any) => f.name) || [];
      const uploadMutations = mutations.filter((name: string) => 
        name.includes('upload') || name.includes('file') || name.includes('media') || name.includes('Upload')
      );
      console.log('Available upload mutations:', uploadMutations);
      console.log('All mutations:', mutations.slice(0, 20)); // First 20 for debugging
    } else {
      console.log('Schema query failed:', schemaResponse.status, await schemaResponse.text());
    }

    // Test with a simple query first to ensure auth works
    console.log('Testing basic GraphQL connectivity...');
    const testResponse = await fetch(saleorApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenToUse}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `query { shop { name } }`
      })
    });
    
    if (testResponse.ok) {
      const testResult = await testResponse.json();
      console.log('Basic GraphQL test:', testResult);
    } else {
      console.log('Basic GraphQL test failed:', testResponse.status, await testResponse.text());
      return res.status(testResponse.status).json({
        success: 0,
        message: `GraphQL connectivity test failed: ${testResponse.status}`
      });
    }

    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    // For now, return a placeholder since we need to fix the upload format
    return res.status(400).json({
      success: 0,
      message: 'File upload not yet properly configured - working on multipart format fix',
      debug: {
        fileReceived: !!file,
        filename: file?.originalFilename,
        size: file?.size,
        authWorking: testResponse.ok
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