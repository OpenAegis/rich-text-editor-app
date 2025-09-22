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
      if (typeof window !== 'undefined') {
        // @ts-ignore
        const EditorJS = (await import('@editorjs/editorjs')).default;
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
        const AlignmentTune = (await import('editorjs-text-alignment-blocktune')).default;
        // @ts-ignore
        const Undo = (await import('editorjs-undo')).default;
        // @ts-ignore
        const Code = (await import('@editorjs/code')).default;
        // @ts-ignore
        const RawTool = (await import('@editorjs/raw')).default;
        // @ts-ignore
        const Delimiter = (await import('@editorjs/delimiter')).default;
        // @ts-ignore
        const Warning = (await import('@editorjs/warning')).default;
        // @ts-ignore
        const Checklist = (await import('@editorjs/checklist')).default;
        // @ts-ignore
        const NestedList = (await import('@editorjs/nested-list')).default;
        // @ts-ignore
        const AttachesTool = (await import('@editorjs/attaches')).default;
        // @ts-ignore
        const LinkTool = (await import('@editorjs/link')).default;
        // @ts-ignore
        const Personality = (await import('@editorjs/personality')).default;
        // @ts-ignore
        const Button = (await import('editorjs-button')).default;
        // @ts-ignore
        const Alert = (await import('editorjs-alert')).default;
        // @ts-ignore
        const CodeBox = (await import('@bomdi/codebox')).default;

        // 加载保存的内容
        const savedContent = await loadSavedContent();
        console.log('Loaded content:', savedContent);

        // @ts-ignore
        editorRef.current = new EditorJS({
          holder: 'editorjs',
          data: savedContent,
          onReady: () => {
            console.log('EditorJS is ready');
          },
          onChange: () => {
            console.log('Editor content changed');
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
            // @ts-ignore
            code: Code,
            // @ts-ignore
            raw: RawTool,
            // @ts-ignore
            delimiter: Delimiter,
            // @ts-ignore
            warning: Warning,
            // @ts-ignore
            checklist: Checklist,
            // @ts-ignore
            nestedlist: NestedList,
            // @ts-ignore
            attaches: {
              class: AttachesTool,
              config: {
                endpoint: '/api/upload-image'
              }
            },
            // @ts-ignore
            linkTool: {
              class: LinkTool,
              config: {
                endpoint: '/api/fetch-url'
              }
            },
            // @ts-ignore
            personality: {
              class: Personality,
              config: {
                endpoint: '/api/fetch-url'
              }
            },
            // @ts-ignore
            button: Button,
            // @ts-ignore
            alert: Alert,
            // @ts-ignore
            codeBox: CodeBox,
          },
          tunes: {
            alignmentTune: AlignmentTune
          },
          placeholder: '在这里编写富文本内容...'
        });

        // @ts-ignore
        const undo = new Undo({ editor: editorRef.current });
        // @ts-ignore
        undo.initialize();
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