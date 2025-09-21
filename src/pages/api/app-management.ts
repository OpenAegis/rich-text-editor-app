import { NextApiRequest, NextApiResponse } from 'next';
import { saleorApp } from '@/saleor-app';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    switch (action) {
      case 'uninstall':
        await handleUninstall(req, res);
        break;
      case 'update':
        await handleUpdate(req, res);
        break;
      default:
        res.status(400).json({ success: false, message: 'Invalid action' });
    }
  } catch (error) {
    console.error('App management error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Operation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleUninstall(req: NextApiRequest, res: NextApiResponse) {
  const { saleorApiUrl } = req.body;
  
  if (!saleorApiUrl) {
    return res.status(400).json({ 
      success: false, 
      message: 'Saleor API URL is required' 
    });
  }

  try {
    // 从APL中删除认证数据
    await saleorApp.apl.delete(saleorApiUrl);
    
    // 清理应用数据
    // 这里可以添加清理用户数据的逻辑
    console.log(`App uninstalled for domain: ${saleorApiUrl}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'App successfully uninstalled' 
    });
  } catch (error) {
    console.error('Uninstall error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to uninstall app' 
    });
  }
}

async function handleUpdate(req: NextApiRequest, res: NextApiResponse) {
  const { saleorApiUrl } = req.body;
  
  if (!saleorApiUrl) {
    return res.status(400).json({ 
      success: false, 
      message: 'Saleor API URL is required' 
    });
  }

  try {
    // 获取当前认证数据
    const authData = await saleorApp.apl.get(saleorApiUrl);
    
    if (!authData) {
      return res.status(404).json({ 
        success: false, 
        message: 'App not installed for this domain' 
      });
    }

    // 这里可以添加更新逻辑，比如：
    // - 重新注册webhooks
    // - 更新权限
    // - 同步配置
    
    console.log(`App updated for domain: ${saleorApiUrl}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'App successfully updated',
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update app' 
    });
  }
}