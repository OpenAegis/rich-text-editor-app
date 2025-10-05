// @ts-ignore
// @ts-ignore
import { useAppBridge } from '@saleor/app-sdk/app-bridge';
// @ts-ignore
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { Button } from '@saleor/macaw-ui';

// 动态导入EditorJSWrapper组件以避免SSR问题
// @ts-ignore
const EditorJSWrapper = dynamic(() => import('../components/EditorJSWrapper'), { ssr: false });

export default function RichEditor() {
  // @ts-ignore
  const { appBridge } = useAppBridge();
  const [productId, setProductId] = useState<string | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    // 检测是否在 iframe 中
    setIsInIframe(window.self !== window.top);

    // 从当前页面URL中直接获取productId参数
    const urlParams = new URLSearchParams(window.location.search);
    const productIdFromUrl = urlParams.get('productId');
    const embeddedParam = urlParams.get('embedded');

    setIsEmbedded(embeddedParam === 'true');

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

    let lastHeight = 0;
    let debounceTimer: NodeJS.Timeout | null = null;

    const sendHeightToParent = () => {
      // 获取编辑器容器的实际高度
      const editorContainer = document.querySelector('.custom-rich-editor-wrapper') || document.body;
      const currentHeight = editorContainer.scrollHeight;

      // 只在高度变化超过阈值时才发送（避免微小变化导致的循环）
      const heightDiff = Math.abs(currentHeight - lastHeight);
      if (heightDiff < 3) {
        return;
      }

      lastHeight = currentHeight;

      window.parent.postMessage({
        type: 'resize',
        height: currentHeight
      }, '*');

      console.log('发送高度到父窗口:', currentHeight);
    };

    // 防抖函数
    const debouncedSendHeight = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        sendHeightToParent();
      }, 100); // 100ms 防抖
    };

    // 初始发送（延迟一下等待内容渲染）
    setTimeout(sendHeightToParent, 1000);

    // 使用 ResizeObserver 监听编辑器容器高度变化
    const resizeObserver = new ResizeObserver(() => {
      debouncedSendHeight();
    });

    // 等待容器渲染后再监听
    setTimeout(() => {
      const editorContainer = document.querySelector('.custom-rich-editor-wrapper') || document.body;
      resizeObserver.observe(editorContainer);
    }, 500);

    return () => {
      resizeObserver.disconnect();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [isInIframe]);

  return (
    <div className="custom-rich-editor-wrapper" style={isEmbedded ? {
      padding: '0',
      margin: '0'
    } : {
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {!isEmbedded && (
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
            <Button
              onClick={() => window.history.back()}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 7.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5z"/>
              </svg>
              返回
            </Button>
            <h2 style={{ margin: 0, color: '#333' }}>商品富文本编辑器</h2>
          </div>
        </div>
      )}

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