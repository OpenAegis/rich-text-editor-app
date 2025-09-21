import { NextApiRequest, NextApiResponse } from 'next';

// 简单的内存存储 - 在生产环境中应该使用数据库
let contentStorage: Record<string, any> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { content, productId = 'default' } = req.body;
      
      if (!content) {
        return res.status(400).json({ 
          success: false, 
          message: 'Content is required' 
        });
      }

      // 保存内容
      contentStorage[productId] = {
        content,
        updatedAt: new Date().toISOString()
      };

      console.log('Saved content for product:', productId);
      
      res.status(200).json({ 
        success: true, 
        message: 'Content saved successfully' 
      });
    } catch (error) {
      console.error('Save error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to save content' 
      });
    }
  } else if (req.method === 'GET') {
    try {
      const { productId = 'default' } = req.query;
      
      const savedData = contentStorage[productId as string];
      
      if (!savedData) {
        return res.status(200).json({ 
          success: true, 
          content: null 
        });
      }

      res.status(200).json({ 
        success: true, 
        content: savedData.content,
        updatedAt: savedData.updatedAt
      });
    } catch (error) {
      console.error('Load error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to load content' 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}