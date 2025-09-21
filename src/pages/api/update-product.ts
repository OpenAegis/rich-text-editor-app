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
    
    // 根据 productId 获取认证数据
    let authData, saleorApiUrl;
    
    if (req.method === 'POST') {
      const { productId } = req.body;
      if (productId) {
        try {
          authData = await saleorApp.apl.get(productId);
          if (authData) {
            saleorApiUrl = authData.saleorApiUrl;
            console.log('Found auth data for productId:', productId);
          } else {
            console.log('No auth data found for productId:', productId);
          }
        } catch (error) {
          console.log('Could not get auth data by productId, trying to get first available:', error);
        }
      }
    } else if (req.method === 'GET') {
      const { productId } = req.query;
      if (productId && typeof productId === 'string') {
        try {
          authData = await saleorApp.apl.get(productId);
          if (authData) {
            saleorApiUrl = authData.saleorApiUrl;
            console.log('Found auth data for productId:', productId);
          } else {
            console.log('No auth data found for productId:', productId);
          }
        } catch (error) {
          console.log('Could not get auth data by productId, trying to get first available:', error);
        }
      }
    }

    // 如果没有通过 productId 找到认证数据，尝试获取第一个可用的
    if (!authData || !saleorApiUrl) {
      console.log('Trying to get first available auth data');
      
      // 对于支持 getAll 的 APL（如 FileAPL）
      try {
        const allAuthData = await saleorApp.apl.getAll();
        console.log('All auth data keys:', Object.keys(allAuthData));
        const authEntries = Object.entries(allAuthData);
        
        if (authEntries.length > 0) {
          // 使用第一个可用的认证数据
          const [firstSaleorApiUrl, firstAuthData] = authEntries[0];
          authData = firstAuthData;
          saleorApiUrl = firstSaleorApiUrl;
          console.log('Using first available auth data');
        }
      } catch (error: any) {
        // UpstashAPL 不支持 getAll，这是正常的
        console.log('APL does not support getAll, this is expected for UpstashAPL:', error.message || error);
      }
    }

    // 如果仍然没有认证数据，返回错误
    if (!authData || !authData.token || !saleorApiUrl) {
      console.log('No valid auth data found');
      return res.status(401).json({ 
        success: false, 
        message: 'No valid authentication data found. Please install the app first.' 
      });
    }

    console.log('Using Saleor URL:', saleorApiUrl);
    console.log('Auth data available:', !!authData, !!authData?.token);

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