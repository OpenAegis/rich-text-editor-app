import { NextApiRequest, NextApiResponse } from 'next';
import { saleorApp } from '@/saleor-app';

const UPDATE_PRODUCT_MUTATION = `
  mutation UpdateProduct($id: ID!, $input: ProductInput!) {
    productUpdate(id: $id, input: $input) {
      product {
        id
        description
      }
      errors {
        field
        message
      }
    }
  }
`;

const GET_PRODUCT_QUERY = `
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      description
      name
    }
  }
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 获取所有已安装的认证数据
    const allAuthData = await saleorApp.apl.getAll();
    const authEntries = Object.entries(allAuthData);
    
    if (authEntries.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'No Saleor instances found. Please install the app first.' 
      });
    }

    // 使用第一个可用的认证数据（在生产环境中可能需要更智能的选择）
    const [saleorApiUrl, authData] = authEntries[0];
    
    if (!authData || !authData.token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authentication data' 
      });
    }

  if (req.method === 'POST') {
    // 更新商品描述
    try {
      const { productId, description } = req.body;
      
      if (!productId || description === undefined) {
        return res.status(400).json({ 
          success: false, 
          message: 'Product ID and description are required' 
        });
      }

      const response = await fetch(saleorApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.token}`,
        },
        body: JSON.stringify({
          query: UPDATE_PRODUCT_MUTATION,
          variables: {
            id: productId,
            input: {
              description: description
            }
          }
        })
      });

      const result = await response.json();

      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        return res.status(400).json({ 
          success: false, 
          message: 'Failed to update product',
          errors: result.errors
        });
      }

      if (result.data.productUpdate.errors.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Product update failed',
          errors: result.data.productUpdate.errors
        });
      }

      res.status(200).json({ 
        success: true, 
        message: 'Product description updated successfully',
        product: result.data.productUpdate.product
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update product description' 
      });
    }
  } else if (req.method === 'GET') {
    // 获取商品描述
    try {
      const { productId } = req.query;
      
      if (!productId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Product ID is required' 
        });
      }

      const response = await fetch(saleorApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.token}`,
        },
        body: JSON.stringify({
          query: GET_PRODUCT_QUERY,
          variables: {
            id: productId
          }
        })
      });

      const result = await response.json();

      if (result.errors) {
        console.error('GraphQL errors:', result.errors);
        return res.status(400).json({ 
          success: false, 
          message: 'Failed to fetch product',
          errors: result.errors
        });
      }

      res.status(200).json({ 
        success: true, 
        product: result.data.product
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch product' 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
  } catch (error) {
    console.error('API handler error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}