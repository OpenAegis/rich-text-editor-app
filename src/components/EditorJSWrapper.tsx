// @ts-ignore
import { useEffect, useRef, useState } from 'react';

const EditorJSWrapper = ({ appBridge, productId }: any) => {
  const editorRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [savedContent, setSavedContent] = useState<any>(null);

  // 只运行一次加载配置
  useEffect(() => {
    setIsClient(true);
    
    // 加载配置
    const savedConfig = localStorage.getItem('editorConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    } else {
      // 默认配置
      const defaultConfig = {
        tools: {
          code: true,
          checklist: true,
          warning: true,
          delimiter: true,
          nestedList: true,
          personality: true,
          raw: true,
          link: true,
          attaches: true,
          button: true,
          textAlignment: true
        },
        theme: 'light',
        userRole: 'admin',
        enableAdvancedTools: true
      };
      setConfig(defaultConfig);
      localStorage.setItem('editorConfig', JSON.stringify(defaultConfig));
    }
  }, []);

  // 加载保存的内容
  useEffect(() => {
    if (!isClient || !productId || !appBridge) {
      return;
    }

    let isMounted = true;

    const loadSavedContent = async () => {
      try {
        console.log('Loading content for productId:', productId);
        
        // 获取Saleor认证头部
        const { token, saleorApiUrl } = appBridge.getState();
        console.log('Token available:', !!token);
        console.log('Saleor API URL:', saleorApiUrl);
        
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
            let parsed = JSON.parse(data.product.description);
            // 清理转义
            if (parsed.blocks) {
              parsed.blocks = parsed.blocks.map((block: any) => ({
                ...block,
                data: {
                  ...block.data,
                  text: block.data.text ? block.data.text.replace(/\\\\/g, '\\').replace(/\\\"/g, '"') : block.data.text
                }
              }));
            }
            console.log('Cleaned parsed data:', parsed);
            if (isMounted) {
              setSavedContent(parsed);
            }
            return parsed;
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            // 如果不是 JSON，转换为 EditorJS 格式
            const fallback = {
              blocks: [
                {
                  type: "paragraph",
                  data: {
                    text: data.product.description
                  }
                }
              ]
            };
            console.log('Using fallback content:', fallback);
            if (isMounted) {
              setSavedContent(fallback);
            }
            return fallback;
          }
        } else {
          console.log('No content found, using empty');
          if (isMounted) {
            setSavedContent({ blocks: [] });
          }
          return { blocks: [] };
        }
      } catch (error) {
        console.error('Failed to load content:', error);
        if (isMounted) {
          setSavedContent({ blocks: [] });
        }
        return { blocks: [] };
      }
    };

    loadSavedContent();

    return () => {
      isMounted = false;
    };
  }, [isClient, productId, appBridge]);

  // 初始化编辑器
  useEffect(() => {
    if (!isClient || !config || isInitialized || !productId || savedContent === null) {
      return;
    }

    let isMounted = true;

    const initEditor = async () => {
      console.log('Starting initEditor');
      const holderElement = document.getElementById('editorjs');
      if (!isMounted || typeof window === 'undefined' || !holderElement) {
        console.log('DOM not ready or unmounted, holder:', !!holderElement);
        return;
      }

      try {
        console.log('Initializing EditorJS with content:', savedContent);
        console.log('Holder element found:', holderElement);

        // @ts-ignore
        const EditorJS = (await import('@editorjs/editorjs')).default;
        // @ts-ignore
        const Header = (await import('@editorjs/header')).default;
        // @ts-ignore
        const List = (await import('@editorjs/list')).default;

        // 最小工具配置 - 只核心工具避免权限问题
        const toolsConfig: any = {
          // @ts-ignore
          header: {
            class: Header,
            inlineToolbar: true,
            shortcut: 'CMD+SHIFT+H',
            config: {
              placeholder: 'Enter a header'
            }
          },
          // @ts-ignore
          list: {
            class: List,
            inlineToolbar: true,
            shortcut: 'CMD+SHIFT+L'
          }
        };

        console.log('Tools config built, keys:', Object.keys(toolsConfig));

        console.log('Creating EditorJS instance with holder:', holderElement);
        // @ts-ignore
        editorRef.current = new EditorJS({
          holder: holderElement,
          data: savedContent,
          onReady: () => {
            console.log('EditorJS is ready');
            console.log('Saved content blocks length:', savedContent?.blocks?.length || 0);
            console.log('First block:', savedContent?.blocks?.[0]);
            console.log('Current editor data on ready:', editorRef.current?.saver?.blocks?.blocks);
            // 手动尝试渲染
            setTimeout(() => {
              console.log('Manual render attempt');
              // @ts-ignore
              editorRef.current.blocks.render({ blocks: savedContent.blocks });
              console.log('Manual render completed');
            }, 100);
            // 应用主题
            if (config?.theme === 'dark') {
              document.documentElement.setAttribute('data-theme', 'dark');
            } else if (config?.theme === 'light') {
              document.documentElement.setAttribute('data-theme', 'light');
            } else {
              // auto - 跟随系统主题
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
            }
          },
          onChange: () => {
            console.log('Editor content changed');
          },
          tools: toolsConfig,
          placeholder: '在这里编写富文本内容...',
          readOnly: false
        });

        console.log('EditorJS instance created successfully');

        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize editor:', error);
        console.error('Error stack:', (error as any).stack);
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    };

    // 延迟初始化以确保 DOM 更新
    requestAnimationFrame(() => {
      setTimeout(() => {
        initEditor();
      }, 200);
    });

    return () => {
      isMounted = false;
      // @ts-ignore
      if (editorRef.current && editorRef.current.destroy) {
        // @ts-ignore
        editorRef.current.destroy();
      }
    };
  }, [isClient, config, productId, appBridge, savedContent]);

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

  if (!isClient || !config || !isInitialized || savedContent === null) {
    return <div id="editorjs" style={{ border: '1px solid #ccc', minHeight: '300px' }}>加载中...</div>;
  }

  return (
    <div data-theme={config.theme}>
      <div id="editorjs" style={{ border: '1px solid #ccc', minHeight: '300px' }}></div>
      <button onClick={handleSave} style={{ marginTop: '10px', padding: '10px 20px' }}>
        保存富文本内容
      </button>
    </div>
  );
};

export default EditorJSWrapper;