// @ts-ignore
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: 0, message: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: 0, message: 'URL is required' });
    }

    // 在实际应用中，您可能需要验证URL并下载图片
    // 这里我们只是简单地返回URL
    res.status(200).json({
      success: 1,
      file: {
        url: url
      }
    });
  } catch (error) {
    res.status(500).json({ success: 0, message: 'Failed to fetch URL' });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};