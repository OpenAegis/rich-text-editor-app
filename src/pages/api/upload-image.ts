import { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import formidable from 'formidable';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: 0, message: 'Method not allowed' });
  }

  try {
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

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype || '')) {
      return res.status(400).json({ 
        success: 0, 
        message: 'Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.' 
      });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const ext = file.originalFilename?.split('.').pop() || 'jpg';
    const filename = `${timestamp}_${random}.${ext}`;
    
    // 创建uploads目录（如果不存在）
    const uploadsDir = './public/uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // 移动文件到uploads目录
    const newPath = `${uploadsDir}/${filename}`;
    fs.copyFileSync(file.filepath, newPath);
    
    // 清理临时文件
    fs.unlinkSync(file.filepath);
    
    // 返回可访问的URL
    const fileUrl = `/uploads/${filename}`;
    
    res.status(200).json({
      success: 1,
      file: {
        url: fileUrl
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: 0, 
      message: 'Upload failed. Please try another image.' 
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};