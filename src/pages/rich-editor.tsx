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
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // 检测是否在 iframe 中
    setIsInIframe(window.self !== window.top);

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

  // 监听页面高度变化并通知父窗口
  useEffect(() => {
    if (!isInIframe) return;

    const sendHeightToParent = () => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({
        type: 'resize',
        height: height
      }, '*');
    };

    // 初始发送
    sendHeightToParent();

    // 使用 ResizeObserver 监听高度变化
    const resizeObserver = new ResizeObserver(() => {
      sendHeightToParent();
    });

    resizeObserver.observe(document.body);

    // 使用 MutationObserver 监听 DOM 变化
    const mutationObserver = new MutationObserver(() => {
      sendHeightToParent();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // 定期检查（备用方案）
    const interval = setInterval(sendHeightToParent, 1000);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      clearInterval(interval);
    };
  }, [isInIframe]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        marginBottom: '20px',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '15px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '10px'
        }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '8px 12px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '14px',
              color: '#333',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 7.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5z"/>
            </svg>
            返回
          </button>
          <h2 style={{ margin: 0, color: '#333' }}>商品富文本编辑器</h2>
        </div>
        <div style={{ fontSize: '14px', color: '#666', paddingLeft: '59px' }}>
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