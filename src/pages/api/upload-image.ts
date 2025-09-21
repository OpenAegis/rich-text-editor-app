import { NextApiRequest, NextApiResponse } from 'next';
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

    // 读取文件内容
    const fileBuffer = fs.readFileSync(file.filepath);
    const base64Data = fileBuffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64Data}`;

    // 清理临时文件
    fs.unlinkSync(file.filepath);
    
    res.status(200).json({
      success: 1,
      file: {
        url: dataUrl
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