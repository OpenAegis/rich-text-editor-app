// @ts-ignore
import { useState } from 'react';

export default function Configuration() {
  // @ts-ignore
  const [settings, setSettings] = useState({
    enableColors: true,
    enableImages: true,
    enableVideos: true,
    maxImageSize: '5MB'
  });

  return (
    <div style={{ padding: '20px' }}>
      <h2>富文本编辑器配置</h2>
      <div>
        <label>
          <input 
            type="checkbox" 
            checked={settings.enableColors}
            // @ts-ignore
            onChange={(e) => setSettings({...settings, enableColors: e.target.checked})}
          />
          启用文字颜色功能
        </label>
      </div>
      <div>
        <label>
          <input 
            type="checkbox"
            checked={settings.enableImages}
            // @ts-ignore
            onChange={(e) => setSettings({...settings, enableImages: e.target.checked})}
          />
          启用图片上传功能
        </label>
      </div>
      <div>
        <label>
          最大图片大小：
          <select 
            value={settings.maxImageSize}
            // @ts-ignore
            onChange={(e) => setSettings({...settings, maxImageSize: e.target.value})}
          >
            <option value="2MB">2MB</option>
            <option value="5MB">5MB</option>
            <option value="10MB">10MB</option>
          </select>
        </label>
      </div>
    </div>
  );
}