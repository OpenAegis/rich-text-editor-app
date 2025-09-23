// @ts-ignore
import { useEffect, useRef, useState } from 'react';

const EditorJSWrapper = ({ appBridge, productId }: any) => {
  const editorRef = useRef<any>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const loadSavedContent = async () => {
      try {
        // 确保 productId 是有效的
        if (!productId) {
          console.log('No productId provided');
          return null;
        }
        
        console.log('Loading content for productId:', productId);
        
        // 获取Saleor认证头部
        const { token, saleorApiUrl } = appBridge.getState();
        
        const response = await fetch(`/api/update-product?productId=${encodeURIComponent(productId)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'saleor-api-url': saleorApiUrl,
          }
        });
        const data = await response.json();
        console.log('Load content response:', data);
        
        if (data.success && data.product && data.product.description) {
          // 尝试解析描述为 JSON（如果是 EditorJS 格式）
          try {
            return JSON.parse(data.product.description);
          } catch {
            // 如果不是 JSON，转换为 EditorJS 格式
            return {
              blocks: [
                {
                  type: "paragraph",
                  data: {
                    text: data.product.description
                  }
                }
              ]
            };
          }
        }
        return null;
      } catch (error) {
        console.error('Failed to load content:', error);
        return null;
      }
    };
    
    const initEditor = async () => {
      console.log('initEditor 调用次数:', initializedRef.current ? '重复调用' : '首次调用');
      
      if (initializedRef.current) {
        console.log('EditorJS 已初始化，跳过重复初始化');
        return;
      }
      
      console.log('开始初始化 EditorJS');
      console.log('当前 window 对象:', typeof window !== 'undefined');
      
      const holderElement = holderRef.current;
      console.log('Editor holder 元素 (ref):', holderElement);
      
      // 清理 holder 中的现有内容以避免冲突
      if (holderElement) {
        holderElement.innerHTML = '';
        console.log('已清理 holder 内容');
      } else {
        console.error('holderRef.current 为 null，无法初始化');
        return;
      }
      
      if (typeof window !== 'undefined') {
        try {
          // @ts-ignore
          const EditorJS = (await import('@editorjs/editorjs')).default;
          console.log('EditorJS 导入成功:', EditorJS);
          
          // @ts-ignore
          const Header = (await import('@editorjs/header')).default;
          // @ts-ignore
          const List = (await import('@editorjs/list')).default;
          // @ts-ignore
          const Image = (await import('@editorjs/image')).default;
          // @ts-ignore
          const Table = (await import('@editorjs/table')).default;
          // @ts-ignore
          const Quote = (await import('@editorjs/quote')).default;
          // @ts-ignore
          const Embed = (await import('@editorjs/embed')).default;
          // @ts-ignore
          const Marker = (await import('@editorjs/marker')).default;
          // @ts-ignore
          const Underline = (await import('@editorjs/underline')).default;
          // @ts-ignore
          const InlineCode = (await import('@editorjs/inline-code')).default;
          // @ts-ignore
          const TextVariantTune = (await import('@editorjs/text-variant-tune')).default;
          // @ts-ignore
          const ColorPlugin = (await import('editorjs-text-color-plugin')).default;
          console.log('所有插件导入成功');

          // 加载保存的内容
          const savedContent = await loadSavedContent();
          console.log('Loaded content:', savedContent);

          const editorConfig = {
            holder: holderElement,  // 使用 DOM 元素而不是 ID 字符串
            data: savedContent,
            onReady: () => {
              console.log('EditorJS 初始化完成');
              console.log('Editor 实例 isReady:', editorRef.current?.isReady);
              initializedRef.current = true;
              // 临时移除 Undo 以避免错误，后续可重新添加
              console.log('跳过 Undo 初始化，避免 blocks undefined 错误');
            },
            onChange: (api: any, event: any) => {
              console.log('Editor 内容变化:', event);
            },
            tools: {
              // @ts-ignore
              header: Header,
              // @ts-ignore
              list: List,
              // @ts-ignore
              image: {
                class: Image,
                config: {
                  endpoints: {
                    byFile: '/api/upload-image',
                    byUrl: '/api/fetch-url',
                  },
                  additionalRequestHeaders: {
                    'Authorization': `Bearer ${appBridge.getState().token}`,
                  }
                }
              },
              // @ts-ignore
              table: Table,
              // @ts-ignore
              quote: Quote,
              // @ts-ignore
              embed: Embed,
              // @ts-ignore
              marker: Marker,
              // @ts-ignore
              underline: Underline,
              // @ts-ignore
              inlineCode: InlineCode,
              // @ts-ignore
              Color: {
                class: ColorPlugin,
                config: {
                  colorCollections: [
                    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
                    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
                    '#EC7878','#9C27B0','#673AB7','#3F51B5',
                    '#0070FF','#03A9F4','#00BCD4','#4CAF50',
                    '#8BC34A','#CDDC39','#FFEB3B','#FFC107',
                    '#FF9800','#FF5722','#795548','#9E9E9E'
                  ],
                  defaultColor: '#000000',
                  type: 'text',
                  customPicker: true
                }
              },
              // @ts-ignore
              Marker: {
                class: ColorPlugin,
                config: {
                  colorCollections: [
                    '#FFFF00', '#00FF00', '#FF00FF', '#00FFFF',
                    '#FFA500', '#FFB6C1', '#98FB98', '#87CEEB'
                  ],
                  defaultColor: '#FFFF00',
                  type: 'marker',
                  customPicker: true
                }
              },
            },
            placeholder: '在这里编写富文本内容...'
          };
          
          console.log('EditorJS 配置对象:', editorConfig);
          console.log('配置中的 holder:', editorConfig.holder);
          
          // @ts-ignore
          editorRef.current = new EditorJS(editorConfig);

          console.log('EditorJS 实例创建成功:', editorRef.current);

        } catch (error) {
          console.error('EditorJS 初始化失败:', error);
        }
      } else {
        console.error('window 未定义，无法初始化 EditorJS');
      }
    };

    // 延迟初始化，确保 ref 已设置
    const timeoutId = setTimeout(() => {
      initEditor();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      console.log('组件卸载，销毁 EditorJS');
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
      }
      initializedRef.current = false;
    };
  }, [productId]); // 添加 productId 依赖，确保内容变化时重新加载

  // @ts-ignore
  const handleSave = async () => {
    console.log('Save button clicked');
    console.log('Editor ref:', editorRef.current);
    console.log('ProductId:', productId);
    
    // @ts-ignore
    if (!editorRef.current) {
      console.error('Editor not initialized');
      // @ts-ignore
      appBridge.dispatch({
        type: "notification",
        payload: {
          actionId: "save-error",
          status: "error",
          title: "编辑器未初始化",
          text: "请等待编辑器加载完成"
        }
      });
      return;
    }

    // 确保 productId 是有效的
    if (!productId) {
      console.error('No productId provided');
      // @ts-ignore
      appBridge.dispatch({
        type: "notification",
        payload: {
          actionId: "save-error",
          status: "error",
          title: "缺少商品ID",
          text: "无法保存内容，请刷新页面重试"
        }
      });
      return;
    }

    try {
      console.log('Getting editor data...');
      // @ts-ignore
      const outputData = await editorRef.current.save();
      console.log('Editor data:', outputData);
      
      console.log('Sending save request...');
      
      // 获取Saleor认证头部
      const { token, saleorApiUrl } = appBridge.getState();
      
      // 发送数据到服务器保存到商品描述
      const response = await fetch('/api/update-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'saleor-api-url': saleorApiUrl,
        },
        body: JSON.stringify({
          productId: productId,
          description: JSON.stringify(outputData)
        }),
      });

      console.log('Save response:', response.status);
      const result = await response.json();
      console.log('Save result:', result);
      
      if (result.success) {
        // 显示成功通知
        // @ts-ignore
        appBridge.dispatch({
          type: "notification",
          payload: {
            actionId: "save-success",
            status: "success",
            title: "富文本内容已保存"
          }
        });
      } else {
        throw new Error(result.message || '保存失败');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      // @ts-ignore
      appBridge.dispatch({
        type: "notification", 
        payload: {
          actionId: "save-error",
          status: "error",
          title: "保存失败",
          // @ts-ignore
          text: error.message || '请稍后重试'
        }
      });
    }
  };

  if (!isClient) {
    return <div ref={holderRef} style={{ border: '1px solid #ccc', minHeight: '300px' }}>加载中...</div>;
  }

  return (
    <div>
      <div ref={holderRef} style={{ border: '1px solid #ccc', minHeight: '300px' }}></div>
      <button onClick={handleSave} style={{ marginTop: '10px', padding: '10px 20px' }}>
        保存富文本内容
      </button>
    </div>
  );
};

export default EditorJSWrapper;