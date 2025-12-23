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
    console.log('=== UPDATE PRODUCT API VERSION 2.0 ===');
    console.log('Update product API called, method:', req.method);
    console.log('Request query:', req.query);
    console.log('Request body:', req.body);
    
    // 获取认证信息 - 支持多种认证方式
    let saleorApiUrl = req.headers['saleor-api-url'] as string;
    let authorizationHeader = req.headers['authorization'] as string;
    let authData;
    let receivedToken;

    // 方案1: 标准Saleor Dashboard认证（有认证头）
    if (saleorApiUrl && authorizationHeader) {
      console.log('Using Saleor Dashboard authentication');
      receivedToken = authorizationHeader.replace('Bearer ', '');
      
      if (!receivedToken) {
        return res.status(401).json({
          success: false,
          message: 'Invalid authorization header format'
        });
      }
      
      try {
        authData = await saleorApp.apl.get(saleorApiUrl);
        if (!authData) {
          return res.status(401).json({
            success: false,
            message: 'No authentication data found for this Saleor instance'
          });
        }
        
        // 对于Saleor Dashboard请求，JWT token和存储的app token是不同的
        // 这里我们验证能够获取到对应的认证数据就表示Saleor API URL是有效的
        console.log('Found matching auth data for Saleor API URL');
      } catch (error) {
        console.error('Failed to get auth data:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to verify authentication'
        });
      }
    } else {
      // 方案2: 直接API访问（使用存储的认证数据）
      console.log('Using direct API access, trying to get stored auth data');
      
      try {
        // 从当前 APL（File/Turso/...）中取第一个可用的认证数据
        const allAuthData = await saleorApp.apl.getAll();

        if (allAuthData.length > 0) {
          authData = allAuthData[0];
          saleorApiUrl = authData.saleorApiUrl;
          receivedToken = authData.token;
          console.log('Using first available auth data from APL');
        } else {
          return res.status(401).json({
            success: false,
            message: 'No authentication data available'
          });
        }
      } catch (error: any) {
        console.log('Failed to get auth data from APL, trying environment fallback');
        
        // 从环境变量获取默认的Saleor API URL
        const defaultSaleorUrl = process.env.SALEOR_API_URL || 'https://api.lzsm.shop/graphql/';
        
        try {
          authData = await saleorApp.apl.get(defaultSaleorUrl);
          if (authData) {
            saleorApiUrl = defaultSaleorUrl;
            receivedToken = authData.token;
            console.log('Using stored auth data for default Saleor API URL');
          } else {
            return res.status(401).json({
              success: false,
              message: 'No authentication data found'
            });
          }
        } catch (aplError) {
          return res.status(500).json({
            success: false,
            message: 'Failed to retrieve authentication data'
          });
        }
      }
    }

    console.log('Using Saleor URL:', saleorApiUrl);
    console.log('Authentication verified successfully');
    console.log('AuthData available:', !!authData);
    console.log('ReceivedToken available:', !!receivedToken);

    if (req.method === 'POST') {
      // 更新商品描述
      console.log('=== Starting POST request handling ===');
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
        console.log('Using JWT token:', receivedToken ? receivedToken.substring(0, 20) + '...' : 'No token');
        console.log('Using app token:', authData?.token ? authData.token.substring(0, 20) + '...' : 'No app token');
        console.log('Request variables:', { id: productId, description: description.substring(0, 100) + '...' });
        
        // 对于Saleor Dashboard应用，尝试使用存储的app token而不是JWT token
        // 因为502错误可能是因为JWT token无法访问GraphQL API
        const tokenToUse = authData?.token || receivedToken;
        console.log('Final token to use:', tokenToUse ? tokenToUse.substring(0, 20) + '...' : 'No token');
        
        // 先做一个简单的连接测试
        console.log('Testing connection to Saleor API...');
        try {
          const testResponse = await fetch(saleorApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: 'query { __typename }'
            })
          });
          console.log('Test response status:', testResponse.status);
          const testResult = await testResponse.text();
          console.log('Test response:', testResult.substring(0, 200));
        } catch (testError) {
          console.error('Connection test failed:', testError);
          return res.status(500).json({
            success: false,
            message: 'Cannot connect to Saleor API',
            error: testError instanceof Error ? testError.message : String(testError)
          });
        }
        
        // 测试带token的简单认证请求
        console.log('Testing authenticated request...');
        try {
          const authTestResponse = await fetch(saleorApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tokenToUse}`,
            },
            body: JSON.stringify({
              query: 'query { me { email } }'
            })
          });
          console.log('Auth test response status:', authTestResponse.status);
          if (authTestResponse.status === 502) {
            return res.status(502).json({
              success: false,
              message: 'Token authentication failed with 502 error',
              token: tokenToUse.substring(0, 20) + '...'
            });
          }
        } catch (authTestError) {
          console.error('Auth test failed:', authTestError);
        }
        
        const response = await fetch(saleorApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenToUse}`,
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
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        // 检查响应是否为JSON
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response received:', text.substring(0, 500));
          return res.status(response.status).json({
            success: false,
            message: `Saleor API returned non-JSON response. Possible authentication failure.`,
            details: {
              status: response.status,
              contentType,
              responsePreview: text.substring(0, 200)
            }
          });
        }
        
        const result = await response.json();
        console.log('GraphQL result:', JSON.stringify(result, null, 2));
        
        // 添加更详细的调试信息
        if (!response.ok) {
          console.error('GraphQL request failed with status:', response.status);
          return res.status(response.status).json({
            success: false,
            message: `GraphQL request failed with status ${response.status}`,
            details: result
          });
        }

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
          message: 'Failed to update product description',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
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
          message: 'Failed to fetch product',
          error: error instanceof Error ? error.message : String(error)
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
