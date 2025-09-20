// @ts-ignore
import { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import formidable from 'formidable';
// @ts-ignore
import fs from 'fs';
// @ts-ignore
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: 0, message: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm();
  // @ts-ignore
  form.uploadDir = path.join(process.cwd(), 'public/uploads');
  form.keepExtensions = true;

  try {
    // @ts-ignore
    const [fields, files] = await form.parse(req);
    // @ts-ignore
    const file = files.image?.[0];
    
    if (!file) {
      return res.status(400).json({ success: 0, message: 'No file uploaded' });
    }

    // @ts-ignore
    const filename = `/uploads/${path.basename(file.filepath)}`;
    
    res.status(200).json({
      success: 1,
      file: {
        url: filename
      }
    });
  } catch (error) {
    res.status(500).json({ success: 0, message: 'Upload failed' });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};