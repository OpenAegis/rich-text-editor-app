// @ts-ignore
import { useEffect, useRef, useState } from 'react';

const EditorJSWrapper = ({ appBridge }: any) => {
  const editorRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
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

        // @ts-ignore
        editorRef.current = new EditorJS({
          holder: 'editorjs',
          tools: {
            // @ts-ignore
            header: {
              class: Header,
              tunes: ['textVariant']
            },
            // @ts-ignore
            list: {
              class: List,
              tunes: ['textVariant']
            },
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
            table: {
              class: Table,
              tunes: ['textVariant']
            },
            // @ts-ignore
            quote: {
              class: Quote,
              tunes: ['textVariant']
            },
            // @ts-ignore
            embed: {
              class: Embed
            },
            // @ts-ignore
            marker: {
              class: Marker
            },
            // @ts-ignore
            underline: {
              class: Underline
            },
            // @ts-ignore
            inlineCode: {
              class: InlineCode
            },
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
    // @ts-ignore
    if (editorRef.current) {
      // @ts-ignore
      const outputData = await editorRef.current.save();
      
      try {
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
      } catch (error: any) {
        // @ts-ignore
        appBridge.dispatch({
          type: "notification", 
          payload: {
            actionId: "save-error",
            status: "error",
            title: "保存失败",
            // @ts-ignore
            text: error.message
          }
        });
      }
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