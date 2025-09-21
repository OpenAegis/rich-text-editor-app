// @ts-ignore
import { useEffect, useState } from 'react';
// @ts-ignore
import { useAppBridge } from '@saleor/app-sdk/app-bridge';
// @ts-ignore
import dynamic from 'next/dynamic';

// 动态导入EditorJSWrapper组件以避免SSR问题
// @ts-ignore
const EditorJSWrapper = dynamic(() => import('../components/EditorJSWrapper'), { ssr: false });

export default function RichEditor() {
  // @ts-ignore
  const { appBridge } = useAppBridge();
  const [productId, setProductId] = useState<string | null>(null);

  useEffect(() => {
    console.log('RichEditor mounted, window.location:', window.location);
    console.log('Window location search:', window.location.search);
    
    // 从URL参数获取商品ID
    const urlParams = new URLSearchParams(window.location.search);
    console.log('URL params:', Object.fromEntries(urlParams.entries()));
    
    // 尝试获取不同的参数名
    const id = urlParams.get('id') || urlParams.get('productId');
    console.log('Extracted ID from URL:', id);
    
    if (id) {
      setProductId(id);
    } else {
      // 如果没有ID参数，尝试从appBridge获取上下文
      console.log('No ID in URL, trying to get from appBridge context');
      if (appBridge) {
        // 尝试获取当前上下文
        try {
          const state = appBridge.getState();
          console.log('AppBridge state:', state);
          // 简化处理，不依赖特定属性
          appBridge.dispatch({
            type: "redirect",
            payload: {
              actionId: "redirect-to-products",
              to: "/products"
            }
          });
        } catch (error) {
          console.error('Error getting AppBridge state:', error);
        }
      }
    }
  }, [appBridge]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '15px'
      }}>
        <h2 style={{ margin: 0, color: '#333' }}>商品富文本编辑器</h2>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Saleor 富文本编辑器扩展
        </div>
      </div>
      
      {productId ? (
        <div>
          <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
            Product ID: {productId}
          </div>
          <EditorJSWrapper appBridge={appBridge} productId={productId} />
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>加载中...</p>
        </div>
      )}
    </div>
  );
}