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
    console.log('Update product API called, method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    
    // 获取认证信息
    const saleorApiUrl = req.headers['saleor-api-url'] as string;
    const authorizationHeader = req.headers['authorization'] as string;
    
    if (!saleorApiUrl || !authorizationHeader) {
      return res.status(401).json({
        success: false,
        message: 'Missing required authentication headers'
      });
    }
    
    // 从Authorization header中提取token
    const receivedToken = authorizationHeader.replace('Bearer ', '');
    
    if (!receivedToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization header format'
      });
    }
    
    // 从APL获取认证数据
    let authData;
    try {
      authData = await saleorApp.apl.get(saleorApiUrl);
      if (!authData) {
        return res.status(401).json({
          success: false,
          message: 'No authentication data found for this Saleor instance'
        });
      }
    } catch (error) {
      console.error('Failed to get auth data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify authentication'
      });
    }
    
    // 验证token是否匹配存储的token
    if (receivedToken !== authData.token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }
    
    // 从存储的数据中获取jwks用于GraphQL请求
    const jwks = authData.jwks;
    console.log('Token verified successfully, using jwks for GraphQL');

    console.log('Using Saleor URL:', saleorApiUrl);
    console.log('Authentication verified successfully');

    if (req.method === 'POST') {
      // 更新商品描述
      try {
        const { productId, description } = req.body;
        console.log('POST request - Product ID:', productId, 'Description length:', description?.length);
        
        if (!productId || description === undefined) {
          return res.status(400).json({ 
            success: false, 
            message: 'Product ID and description are required' 
          });
        }

        console.log('Sending GraphQL request to:', saleorApiUrl);
        const response = await fetch(saleorApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${receivedToken}`,
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

        console.log('GraphQL response status:', response.status);
        const result = await response.json();
        console.log('GraphQL result:', JSON.stringify(result, null, 2));

        if (result.errors) {
          console.error('GraphQL errors:', result.errors);
          return res.status(400).json({ 
            success: false, 
            message: 'Failed to update product',
            errors: result.errors
          });
        }

        // 检查 productUpdate 是否存在以及是否有错误
        if (result.data?.productUpdate?.errors && result.data.productUpdate.errors.length > 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'Product update failed',
            errors: result.data.productUpdate.errors
          });
        }

        // 检查是否成功更新了产品
        if (!result.data?.productUpdate?.product) {
          return res.status(400).json({ 
            success: false, 
            message: 'Product update returned no product data'
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
            'Authorization': `Bearer ${receivedToken}`,
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

        // 检查是否成功获取了产品数据
        if (!result.data?.product) {
          return res.status(400).json({ 
            success: false, 
            message: 'Product not found or no data returned'
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