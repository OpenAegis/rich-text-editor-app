// pages/api/upload-graphql.ts
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';

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
    const { files } = await parseForm(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ success: 0, message: 'No file uploaded' });
    }

    // 构造 GraphQL multipart 请求体
    const formData = new FormData();
    const operations = {
      query: `mutation($file: Upload!) {
        fileUpload(file: $file) {
          uploadedFile { url contentType }
          errors { field message code }
        }
      }`,
      variables: { file: null },
    };
    formData.append('operations', JSON.stringify(operations));
    const map = { '0': ['variables.file'] };
    formData.append('map', JSON.stringify(map));
    const fileStream = fs.createReadStream(file.filepath);
    formData.append('0', fileStream, file.originalFilename || 'upload.bin');

    // 调用 Saleor GraphQL 接口
    const saleorApiUrl = process.env.SALEOR_API_URL!;
    const token = process.env.SALEOR_TOKEN!;
    const response = await fetch(saleorApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData as any,  // 浏览器端 FormData
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
