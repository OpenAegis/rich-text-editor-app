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
      console.log('initEditor 开始');
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
          console.log('Header imported:', typeof Header);
          // @ts-ignore
          const List = (await import('@editorjs/list')).default;
          console.log('List imported:', typeof List);
          // @ts-ignore
          const Image = (await import('@editorjs/image')).default;
          console.log('Image imported:', typeof Image);
          // @ts-ignore
          const Table = (await import('@editorjs/table')).default;
          console.log('Table imported:', typeof Table);
          // @ts-ignore
          const Quote = (await import('@editorjs/quote')).default;
          console.log('Quote imported:', typeof Quote);
          // @ts-ignore
          const Embed = (await import('@editorjs/embed')).default;
          console.log('Embed imported:', typeof Embed);
          // @ts-ignore
          const Marker = (await import('@editorjs/marker')).default;
          console.log('Marker imported:', typeof Marker);
          // @ts-ignore
          const Underline = (await import('@editorjs/underline')).default;
          console.log('Underline imported:', typeof Underline);
          // @ts-ignore
          const InlineCode = (await import('@editorjs/inline-code')).default;
          console.log('InlineCode imported:', typeof InlineCode);
          // @ts-ignore
          const CustomColorTool = (await import('./CustomColorTool')).default;
          console.log('CustomColorTool imported:', typeof CustomColorTool);
          // @ts-ignore
          const Undo = (await import('editorjs-undo')).default;
          console.log('Undo imported:', typeof Undo);
          // @ts-ignore
          const Checklist = (await import('@editorjs/checklist')).default;
          console.log('Checklist imported:', typeof Checklist);
          // @ts-ignore
          const Code = (await import('@editorjs/code')).default;
          console.log('Code imported:', typeof Code);
          // @ts-ignore
          const CodeBox = (await import('@bomdi/codebox')).default;
          console.log('CodeBox imported:', typeof CodeBox);
          // @ts-ignore
          const Delimiter = (await import('@editorjs/delimiter')).default;
          console.log('Delimiter imported:', typeof Delimiter);
          // @ts-ignore
          const Warning = (await import('@editorjs/warning')).default;
          console.log('Warning imported:', typeof Warning);
          // @ts-ignore
          const LinkTool = (await import('@editorjs/link')).default;
          console.log('LinkTool imported:', typeof LinkTool);
          // @ts-ignore
          const Raw = (await import('@editorjs/raw')).default;
          console.log('Raw imported:', typeof Raw);
          // @ts-ignore
          const SimpleImage = (await import('@editorjs/simple-image')).default;
          console.log('SimpleImage imported:', typeof SimpleImage);
          // @ts-ignore
          const Attaches = (await import('@editorjs/attaches')).default;
          console.log('Attaches imported:', typeof Attaches);
          // @ts-ignore
          const NestedList = (await import('@editorjs/nested-list')).default;
          console.log('NestedList imported:', typeof NestedList);
          // @ts-ignore
          const Alert = (await import('editorjs-alert')).default;
          console.log('Alert imported:', typeof Alert);
          // @ts-ignore
          const Button = (await import('editorjs-button')).default;
          console.log('Button imported:', typeof Button);
          // @ts-ignore
          const ToggleBlock = (await import('editorjs-toggle-block')).default;
          console.log('ToggleBlock imported:', typeof ToggleBlock);
          // @ts-ignore
          const AlignmentTune = (await import('editorjs-text-alignment-blocktune')).default;
          console.log('AlignmentTune imported:', typeof AlignmentTune);
          // @ts-ignore
          const DragDrop = (await import('editorjs-drag-drop')).default;
          console.log('DragDrop imported:', typeof DragDrop);
          console.log('所有插件导入成功');
            console.log('导入的工具组件:', { Header, List, Image, Table, Quote, Embed, Marker, Underline, InlineCode, Undo, Checklist, Code, CodeBox, Delimiter, Warning, LinkTool, Raw, SimpleImage, Attaches, NestedList, Alert, Button, ToggleBlock, AlignmentTune, DragDrop });

          // 加载保存的内容
          const savedContent = await loadSavedContent();
          console.log('Loaded savedContent:', savedContent);
          const data = savedContent || { blocks: [] };
          console.log('Using data for EditorJS:', data);
          if (data.blocks && !Array.isArray(data.blocks)) {
            console.warn('data.blocks is not array, setting to empty array');
            data.blocks = [];
          }

          const editorConfig = {
            holder: holderElement,  // 使用 DOM 元素而不是 ID 字符串
            data: data,
            inlineToolbar: ['color', 'marker', 'underline', 'inlineCode'], // 全局启用inline tools
            onReady: async () => {
              // 初始化拖拽功能
              new DragDrop(editorRef.current);
              console.log('EditorJS 初始化完成');
              console.log('Editor 实例:', editorRef.current);
              console.log('Editor 实例 isReady:', editorRef.current?.isReady);
              if (editorRef.current && editorRef.current.isReady) {
                await editorRef.current.isReady;
              } else {
                console.warn('Editor isReady not available, skipping await');
              }
              // 检查inlineToolbar API
              if (editorRef.current && editorRef.current.api && editorRef.current.api.inlineToolbar) {
                console.log('InlineToolbar API available:', typeof editorRef.current.api.inlineToolbar);
                console.log('InlineToolbar config:', editorRef.current.api.inlineToolbar);
              }
              // Editor ready
              console.log('Editor configuration:', editorRef.current?.configuration);
              console.log('EditorJS 完全就绪');
              initializedRef.current = true;
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
              nestedList: NestedList,
              // @ts-ignore
              checklist: Checklist,
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
              simpleImage: SimpleImage,
              // @ts-ignore
              table: Table,
              // @ts-ignore
              quote: Quote,
              // @ts-ignore
              code: Code,
              // @ts-ignore
              codeBox: {
                class: CodeBox,
                config: {
                  themeURL: 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@9.18.1/build/styles/dracula.min.css',
                  themeName: 'atom-one-dark',
                  useDefaultTheme: 'light',
                }
              },
              // @ts-ignore
              delimiter: Delimiter,
              // @ts-ignore
              warning: Warning,
              // @ts-ignore
              linkTool: {
                class: LinkTool,
                config: {
                  endpoint: '/api/fetch-url',
                }
              },
              // @ts-ignore
              raw: Raw,
              // @ts-ignore
              attaches: {
                class: Attaches,
                config: {
                  endpoint: '/api/upload-file',
                  additionalRequestHeaders: {
                    'Authorization': `Bearer ${appBridge.getState().token}`,
                  }
                }
              },
              // @ts-ignore
              embed: Embed,
              // @ts-ignore
              alert: Alert,
              // @ts-ignore
              button: Button,
              // @ts-ignore
              toggle: ToggleBlock,
              // @ts-ignore
              marker: Marker,
              // @ts-ignore
              underline: Underline,
              // @ts-ignore
              inlineCode: InlineCode,
              // @ts-ignore
              color: {
                class: CustomColorTool,
                config: {
                  colorCollections: [
                    '#EC7878',
                    '#9C27B0',
                    '#673AB7',
                    '#3F51B5',
                    '#0070F3',
                    '#03A9F4',
                    '#00BCD4',
                    '#4CAF50',
                    '#8BC34A',
                    '#CDDC39',
                    '#FFC107',
                    '#FF5722',
                    '#795548',
                    '#607D8B',
                    '#000000',
                    '#FFFFFF'
                  ],
                  defaultColor: '#FF1300',
                }
              },
              // @ts-ignore
              alignmentTune: {
                class: AlignmentTune,
                config: {
                  default: "left",
                }
              },
            },
            placeholder: '在这里编写富文本内容...'
          };

          console.log('EditorConfig keys:', Object.keys(editorConfig));
          console.log('当前配置的tools:', Object.keys(editorConfig.tools));
          console.log('配置中的 holder 类型:', typeof editorConfig.holder);
          console.log('EditorJS 配置对象 (部分):', {
            holder: editorConfig.holder ? 'DOM Element' : null,
            toolsKeys: Object.keys(editorConfig.tools),
            placeholder: editorConfig.placeholder
          });

          try {
            // @ts-ignore - EditorJS 类型兼容性问题
            editorRef.current = new EditorJS(editorConfig);
          } catch (initError) {
            console.error('EditorJS new 失败:', initError);
          }
        
          // Remove duplicate log
        
        } catch (error) {
          console.error('EditorJS 初始化失败:', error);
        }
      } else {
        console.error('window 未定义，无法初始化 EditorJS');
      }

      console.log('initEditor 结束');
    };

    console.log('useEffect 开始执行');

    // 延迟初始化，确保 ref 已设置
    const timeoutId = setTimeout(() => {
      initEditor();
    }, 100);

    console.log('useEffect 即将结束，productId:', productId);

    return () => {
      clearTimeout(timeoutId);
      console.log('组件卸载，销毁 EditorJS');
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
      }
      initializedRef.current = false;
    };
  // @ts-ignore
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
      console.log('Editor data saved successfully:', outputData);
      
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

      console.log('Save response status:', response.status);
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