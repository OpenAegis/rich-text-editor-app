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
      
      <EditorJSWrapper appBridge={appBridge} />
    </div>
  );
}
