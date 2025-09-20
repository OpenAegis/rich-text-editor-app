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
    <div style={{ padding: '20px' }}>
      <h2>商品富文本编辑器</h2>
      <EditorJSWrapper appBridge={appBridge} />
    </div>
  );
}
