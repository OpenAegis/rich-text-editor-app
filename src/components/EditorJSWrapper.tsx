// @ts-ignore
import { useEffect, useRef, useState } from 'react';

const EditorJSWrapper = ({ appBridge }: any) => {
  const editorRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const loadSavedContent = async () => {
      try {
        const response = await fetch('/api/save-content?productId=default');
        const data = await response.json();
        return data.success && data.content ? data.content : null;
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
        const Undo = (await import('editorjs-undo')).default;

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
            textVariant: {
              class: TextVariantTune,
              config: {
                default: 'call-out'
              }
            },
            // @ts-ignore
            Color: {
              class: ColorPlugin,
              config: {
                colorCollections: [
                  '#EC7878','#9C27B0','#673AB7','#3F51B5',
                  '#0070FF','#03A9F4','#00BCD4','#4CAF50'
                ],
                defaultColor: '#FF1300',
                type: 'text',
                customPicker: true
              }
            },
            // @ts-ignore
            Marker: {
              class: ColorPlugin,
              config: {
                defaultColor: '#FFBF00',
                type: 'marker'
              }
            }
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

    try {
      console.log('Getting editor data...');
      // @ts-ignore
      const outputData = await editorRef.current.save();
      console.log('Editor data:', outputData);
      
      console.log('Sending save request...');
      // 发送数据到服务器保存
      const response = await fetch('/api/save-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: outputData,
          productId: 'default'
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