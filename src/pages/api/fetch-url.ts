// @ts-ignore
import { NextApiRequest, NextApiResponse } from 'next';

function isAllowedHttpUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: 0, message: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: 0, message: 'URL is required' });
    }

    if (typeof url !== 'string' || !isAllowedHttpUrl(url)) {
      return res.status(400).json({ success: 0, message: 'Invalid URL (only http/https allowed)' });
    }

    // 仅用于“外链图片/链接”场景：不下载、不上传，直接回传 URL
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
