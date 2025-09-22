// @ts-ignore
// @ts-ignore
import { useAppBridge } from '@saleor/app-sdk/app-bridge';
// @ts-ignore
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// 动态导入EditorJSWrapper组件以避免SSR问题
// @ts-ignore
const EditorJSWrapper = dynamic(() => import('../components/EditorJSWrapper'), { ssr: false });

export default function RichEditor() {
  // @ts-ignore
  const { appBridge } = useAppBridge();
  const [productId, setProductId] = useState<string | null>(null);

  useEffect(() => {
    // 从当前页面URL中直接获取productId参数
    const urlParams = new URLSearchParams(window.location.search);
    const productIdFromUrl = urlParams.get('productId');
    
    if (productIdFromUrl) {
      setProductId(productIdFromUrl);
    } else {
      // 如果没有productId参数，尝试获取id参数
      const idFromUrl = urlParams.get('id');
      if (idFromUrl) {
        setProductId(idFromUrl);
      }
    }
  }, []);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '4px 8px',
              background: 'none',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← 返回
          </button>
          <h2 style={{ margin: 0, color: '#333' }}>商品富文本编辑器</h2>
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Saleor 富文本编辑器扩展
        </div>
      </div>
      
      {productId ? (
        <EditorJSWrapper appBridge={appBridge} productId={productId} />
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>加载中...</p>
        </div>
      )}
    </div>
  );
}