// pages/api/upload-graphql.ts
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';               // 使用社区版 FormData
import { saleorApp } from '@/saleor-app';

// 数据库配置接口
interface DatabaseConfig {
  token: string;
  saleorApiUrl: string;
  appId: string;
  jwks: string;
}

// 从数据库获取配置
async function getConfigFromDatabase(key: string): Promise<DatabaseConfig | null> {
  try {
    // 使用传入的key从数据库获取配置
    const config = await saleorApp.apl.get(key) as DatabaseConfig;
    return config;
  } catch (error) {
    console.error('Failed to get config from database:', error);
    return null;
  }
}

export const config = { api: { bodyParser: false } };

// 解析 multipart/form-data（文件+其他字段）
async function parseForm(req: NextApiRequest) {
  const form = formidable({ keepExtensions: true });
  return new Promise<{ files: formidable.Files }>((resolve, reject) => {
    form.parse(req, (err, _fields, files) => (err ? reject(err) : resolve({ files })));
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: 0, message: 'Method not allowed' });
  }

  try {
    // 获取Authorization头部
    const authorizationHeader = req.headers['authorization'] as string;
    
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: 0, message: 'Authorization header is required' });
    }
    
    // 提取JWT token
    const jwtToken = authorizationHeader.replace('Bearer ', '');
    
    // 解析JWT token获取saleorApiUrl (从iss字段)
    let saleorApiUrl: string;
    try {
      const payload = JSON.parse(Buffer.from(jwtToken.split('.')[1], 'base64').toString());
      saleorApiUrl = payload.iss;
      
      if (!saleorApiUrl) {
        return res.status(400).json({ success: 0, message: 'Invalid JWT token: missing issuer' });
      }
    } catch (error) {
      return res.status(400).json({ success: 0, message: 'Invalid JWT token format' });
    }
    
    // 从数据库获取配置
    const config = await getConfigFromDatabase(saleorApiUrl);
    
    if (!config) {
      return res.status(500).json({ success: 0, message: 'No configuration found in database' });
    }
    
    const { token } = config;
    
    const { files } = await parseForm(req);
    console.log('Parsed files:', files); // 调试日志
    
    // 首先尝试获取 file 字段，如果不存在则尝试获取 image 字段
    const file = files.file 
      ? (Array.isArray(files.file) ? files.file[0] : files.file)
      : (files.image ? (Array.isArray(files.image) ? files.image[0] : files.image) : null);
      
    console.log('Selected file:', file); // 调试日志
      
    if (!file) {
      return res.status(400).json({ success: 0, message: 'No file uploaded' });
    }

    // 检查文件路径是否存在
    if (!file.filepath) {
      console.error('File path is missing:', file); // 调试日志
      return res.status(400).json({ success: 0, message: 'File path is missing' });
    }

    // 检查文件是否存在
    if (!fs.existsSync(file.filepath)) {
      console.error('File does not exist:', file.filepath); // 调试日志
      return res.status(400).json({ success: 0, message: 'File does not exist' });
    }

    // 构建 multipart/form-data
    const formData = new FormData();
    formData.append('operations', JSON.stringify({
      query: `mutation($file: Upload!) {
        fileUpload(file: $file) {
          uploadedFile { url contentType }
          errors { field message code }
        }
      }`,
      variables: { file: null },
    }));
    formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
    // 处理可能为 null 的 originalFilename
    const filename = file.originalFilename || 'upload.bin';
    formData.append('0', fs.createReadStream(file.filepath), filename);

    console.log('Making request to:', saleorApiUrl); // 调试日志
    console.log('Operations:', JSON.stringify({
      query: `mutation($file: Upload!) {
        fileUpload(file: $file) {
          uploadedFile { url contentType }
          errors { field message code }
        }
      }`,
      variables: { file: null },
    }));

    const response = await fetch(saleorApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders()               // 自动添加 Content-Type 等头
      },
      body: formData as any
    });

    const result = await response.json();
    if (result.data?.fileUpload?.uploadedFile) {
      return res.status(200).json({
        success: 1,
        url: result.data.fileUpload.uploadedFile.url,
      });
    } else {
      return res.status(500).json({
        success: 0,
        errors: result.data?.fileUpload?.errors || result.errors,
      });
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({ success: 0, message: error.message });
  }
}