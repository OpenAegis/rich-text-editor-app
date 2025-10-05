# Saleor 富文本编辑器油猴脚本

这个油猴脚本可以将 Saleor Dashboard 中默认的商品介绍编辑器替换为自定义的富文本编辑器。

## 功能特性

- ✅ **自动替换编辑器** - 检测并替换 Saleor 默认的商品描述编辑器
- ✅ **自定义服务器地址** - 可配置编辑器服务器地址
- ✅ **iframe 嵌入** - 使用 iframe 嵌入编辑器，安全隔离
- ✅ **高度自适应** - 自动调整 iframe 高度以适应内容
- ✅ **消息通信** - 父子页面通过 postMessage 通信
- ✅ **保存通知** - 实时显示保存状态

## 安装步骤

### 1. 安装 Tampermonkey

首先安装 Tampermonkey 浏览器扩展：

- **Chrome**: [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox**: [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- **Edge**: [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- **Safari**: [App Store](https://apps.apple.com/app/tampermonkey/id1482490089)

### 2. 安装脚本

1. 打开 Tampermonkey 控制面板
2. 点击 "+" 创建新脚本
3. 复制 `saleor-rich-editor.user.js` 的内容并粘贴
4. 保存脚本 (Ctrl+S 或 Cmd+S)

### 3. 配置服务器地址

脚本默认使用 `http://localhost:3000` 作为编辑器服务器地址。

要更改地址：

1. 点击浏览器工具栏中的 Tampermonkey 图标
2. 选择 "设置编辑器服务器地址"
3. 输入新的服务器地址（例如：`https://your-editor.example.com`）
4. 点击确定，页面将自动刷新

## 使用说明

1. **启动编辑器服务器**

   ```bash
   cd rich-text-editor-app
   pnpm dev
   # 或生产环境
   pnpm build
   pnpm start
   ```

2. **访问 Saleor Dashboard**

   打开任意商品编辑页面，例如：
   ```
   https://your-saleor.example.com/dashboard/products/ProductID
   ```

3. **自动替换编辑器**

   脚本会自动检测并替换商品描述编辑器为 iframe 版本。

## 消息通信协议

### 从编辑器发送到父窗口

#### 1. 高度变化
```javascript
{
  type: 'resize',
  height: 600  // 新的高度（像素）
}
```

#### 2. 内容保存成功
```javascript
{
  type: 'contentSaved',
  content: {
    time: 1234567890,
    blocks: [...],
    version: '2.31.0'
  }
}
```

#### 3. 错误
```javascript
{
  type: 'error',
  message: '错误信息'
}
```

### 从父窗口发送到编辑器

目前编辑器不接收来自父窗口的消息，但架构支持未来扩展。

## 支持的 Saleor 选择器

脚本会尝试以下选择器来查找目标编辑器：

1. `textarea[name="description"]`
2. `div[data-test-id="rich-text-editor-description"]`
3. `.ProseMirror`
4. `[contenteditable="true"]`
5. `textarea[id*="description"]`
6. `div[id*="description"]`

如果您的 Saleor 版本使用不同的选择器，请联系开发者。

## 故障排除

### 编辑器没有被替换

1. **检查控制台** - 打开浏览器开发者工具查看错误信息
2. **验证 URL** - 确保页面 URL 匹配脚本的 `@match` 规则
3. **检查选择器** - 可能需要更新选择器以匹配您的 Saleor 版本

### iframe 显示空白

1. **检查服务器地址** - 确保配置的地址正确且服务器正在运行
2. **查看网络请求** - 在开发者工具的 Network 标签中检查请求是否成功
3. **检查 CORS** - 确保服务器允许跨域请求

### 高度不自适应

1. **检查控制台消息** - 查看是否收到 `resize` 消息
2. **验证 ResizeObserver** - 确保浏览器支持 ResizeObserver API
3. **手动刷新** - 尝试刷新页面

## 开发调试

启用调试日志：

```javascript
// 在脚本开头添加
const DEBUG = true;

// 在需要的地方添加
if (DEBUG) {
  console.log('调试信息', data);
}
```

## 安全说明

- 脚本使用 `postMessage` 进行通信，请确保验证消息来源
- 默认使用 `'*'` 作为 targetOrigin，生产环境建议指定具体域名
- iframe 的 CSP 策略由服务器控制

## 许可证

与主项目相同

## 贡献

欢迎提交 Issue 和 Pull Request！
