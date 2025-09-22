// pages/api/upload-graphql.ts
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';                         // Node.js FormData
import { fromNodeReadable } from 'undici';
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
  console.log('=== UPLOAD IMAGE API CALLED ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  // 如果没有Authorization头部，返回详细错误信息
  if (!req.headers['authorization']) {
    console.log('No authorization header found - EditorJS may not be sending it');
    return res.status(401).json({ 
      success: 0, 
      message: 'No Authorization header. EditorJS may not be configured to send authentication headers.',
      debug: {
        receivedHeaders: Object.keys(req.headers)
      }
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: 0, message: 'Method not allowed' });
  }

  try {
    // 获取Authorization头部
    const authorizationHeader = req.headers['authorization'] as string;
    console.log('Authorization header:', authorizationHeader ? 'Present' : 'Missing');
    
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      console.log('Invalid authorization header format');
      return res.status(401).json({ success: 0, message: 'Authorization header is required' });
    }
    
    // 提取JWT token
    const jwtToken = authorizationHeader.replace('Bearer ', '');
    console.log('JWT token extracted:', jwtToken.substring(0, 50) + '...');
    
    // 解析JWT token获取saleorApiUrl (从iss字段)
    let saleorApiUrl: string;
    try {
      const payload = JSON.parse(Buffer.from(jwtToken.split('.')[1], 'base64').toString());
      console.log('JWT payload:', payload);
      saleorApiUrl = payload.iss;
      console.log('Extracted saleorApiUrl:', saleorApiUrl);
      
      if (!saleorApiUrl) {
        return res.status(400).json({ success: 0, message: 'Invalid JWT token: missing issuer' });
      }
    } catch (error) {
      console.error('JWT parsing error:', error);
      return res.status(400).json({ success: 0, message: 'Invalid JWT token format' });
    }
    
    // 从数据库获取配置
    console.log('Querying database with key:', saleorApiUrl);
    const config = await getConfigFromDatabase(saleorApiUrl);
    console.log('Database config result:', config ? 'Found' : 'Not found');
    
    if (!config) {
      return res.status(500).json({ success: 0, message: 'No configuration found in database' });
    }
    
    console.log('Config keys:', Object.keys(config));
    const { token } = config;
    console.log('Token from database:', token ? token.substring(0, 20) + '...' : 'No token');
    
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

    // 构造 Node.js FormData
    const form = new FormData();
    form.append(
      'operations',
      JSON.stringify({
        query: `
          mutation($file: Upload!) {
            fileUpload(file: $file) {
              uploadedFile { url contentType }
              errors { field message code }
            }
          }
        `,
        variables: { file: null },
      })
    ); // 必含完整 query
    form.append('map', JSON.stringify({ '0': ['variables.file'] })); // 必含 map
    form.append('0', fs.createReadStream(file.filepath), file.originalFilename || 'upload.bin');
    
    console.log('Node.js FormData created with proper encoding');

    console.log('Making request to:', saleorApiUrl);
    console.log('Using token:', token ? token.substring(0, 20) + '...' : 'No token');
    console.log('File path:', file.filepath);
    console.log('File exists:', fs.existsSync(file.filepath));

    console.log('FormData headers:', form.getHeaders());
    
    // 先测试一个简单的GraphQL查询来验证认证
    console.log('Testing simple GraphQL query first...');
    try {
      const testResponse = await fetch(saleorApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: 'query { me { email } }'
        })
      });
      const testResult = await testResponse.json();
      console.log('Test query result:', testResult);
      
      if (testResult.errors) {
        console.error('Authentication test failed:', testResult.errors);
        return res.status(401).json({ success: 0, message: 'Authentication failed', errors: testResult.errors });
      }
    } catch (testError) {
      console.error('Test query error:', testError);
    }
    
    const response = await fetch(saleorApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),          // 自动注入正确 Content-Type
      },
      body: fromNodeReadable(form),        // 转换为 web ReadableStream
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('Full response:', JSON.stringify(result, null, 2));
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