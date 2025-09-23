// @ts-ignore
import { useEffect, useRef, useState } from 'react';

const EditorJSWrapper = ({ appBridge, productId }: any) => {
  const editorRef = useRef<any>(null);
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
      console.log('开始初始化 EditorJS');
      console.log('当前 window 对象:', typeof window !== 'undefined');
      console.log('Editor holder 元素:', document.getElementById('editorjs'));
      
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
          // @ts-ignore
          const Undo = (await import('editorjs-undo')).default;

          console.log('所有插件导入成功');

          // 加载保存的内容
          const savedContent = await loadSavedContent();
          console.log('Loaded content:', savedContent);

          console.log('创建 EditorJS 实例前，holder 检查:', document.getElementById('editorjs'));
          
          // @ts-ignore
          editorRef.current = new EditorJS({
            holder: 'editorjs',
            data: savedContent,
            onReady: () => {
              console.log('EditorJS 初始化完成');
            },
            onChange: (api, event) => {
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
          });

          console.log('EditorJS 实例创建成功:', editorRef.current);

          // @ts-ignore
          const undo = new Undo({ editor: editorRef.current });
          // @ts-ignore
          undo.initialize();
          console.log('Undo 插件初始化成功');
        } catch (error) {
          console.error('EditorJS 初始化失败:', error);
        }
      } else {
        console.error('window 未定义，无法初始化 EditorJS');
      }
    };

    initEditor();

    return () => {
      // @ts-ignore
      if (editorRef.current && editorRef.current.destroy) {
        // @ts-ignore
        editorRef.current.destroy();
      }
    };
  }, []);

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
    return <div id="editorjs" style={{ border: '1px solid #ccc', minHeight: '300px' }}>加载中...</div>;
  }

  return (
    <div>
      <div id="editorjs" style={{ border: '1px solid #ccc', minHeight: '300px' }}></div>
      <button onClick={handleSave} style={{ marginTop: '10px', padding: '10px 20px' }}>
        保存富文本内容
      </button>
    </div>
  );
};

export default EditorJSWrapper;