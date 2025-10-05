// ==UserScript==
// @name         Saleor 富文本编辑器增强
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  将 Saleor 默认的商品介绍编辑器替换为自定义富文本编辑器
// @author       You
// @match        https://*/dashboard/products/*
// @match        http://*/dashboard/products/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 默认配置
    const DEFAULT_CONFIG = {
        editorServerUrl: 'http://localhost:3000' // 默认本地开发服务器
    };

    // 获取配置
    function getConfig() {
        const savedUrl = GM_getValue('editorServerUrl', DEFAULT_CONFIG.editorServerUrl);
        return {
            editorServerUrl: savedUrl
        };
    }

    // 保存配置
    function saveConfig(url) {
        GM_setValue('editorServerUrl', url);
        alert('配置已保存！页面将刷新以应用新配置。');
        location.reload();
    }

    // 注册菜单命令
    GM_registerMenuCommand('设置编辑器服务器地址', function() {
        const config = getConfig();
        const newUrl = prompt('请输入编辑器服务器地址:', config.editorServerUrl);
        if (newUrl && newUrl.trim()) {
            saveConfig(newUrl.trim());
        }
    });

    // 从 URL 获取产品 ID
    function getProductIdFromUrl() {
        const match = window.location.pathname.match(/\/products\/([^\/]+)/);
        return match ? match[1] : null;
    }

    // 创建 iframe 编辑器
    function createIframeEditor(targetElement, productId) {
        const config = getConfig();

        // 检查是否已经创建过
        if (targetElement.dataset.richEditorInjected === 'true') {
            console.log('编辑器已经被替换，跳过');
            return;
        }

        // 标记已处理
        targetElement.dataset.richEditorInjected = 'true';

        // 隐藏原编辑器而不是删除它（保持 React 组件树完整）
        targetElement.style.display = 'none';

        // 创建容器
        const container = document.createElement('div');
        container.className = 'custom-rich-editor-container';
        container.style.cssText = `
            position: relative;
            width: 100%;
            min-height: 300px;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
            background: white;
            margin-bottom: 16px;
        `;

        // 创建 iframe
        const iframe = document.createElement('iframe');
        iframe.className = 'custom-rich-editor-iframe';
        iframe.style.cssText = `
            width: 100%;
            height: 300px;
            border: none;
            display: block;
            transition: height 0.3s ease;
        `;
        iframe.src = `${config.editorServerUrl}/rich-editor?productId=${encodeURIComponent(productId)}&embedded=true`;

        container.appendChild(iframe);

        // 获取配置的服务器 origin
        let serverOrigin;
        try {
            serverOrigin = new URL(config.editorServerUrl).origin;
        } catch (e) {
            console.error('无效的服务器地址:', config.editorServerUrl);
            return;
        }

        // 防抖计时器
        let resizeDebounceTimer = null;
        let lastIframeHeight = 300;

        // 监听来自 iframe 的消息
        const messageHandler = function(event) {
            // 宽松的来源验证：检查是否来自配置的服务器或本地开发环境
            const isValidOrigin = event.origin === serverOrigin ||
                                 event.origin.startsWith('http://localhost') ||
                                 event.origin.startsWith('http://127.0.0.1') ||
                                 event.origin.startsWith('https://localhost');

            if (!isValidOrigin) {
                // 静默忽略无效来源的消息
                return;
            }

            const data = event.data;

            // 只处理有效的消息类型
            if (!data || typeof data !== 'object' || !data.type) {
                return;
            }

            console.log('收到来自编辑器的消息:', data);

            // 处理高度变化
            if (data.type === 'resize' && typeof data.height === 'number') {
                // 清除之前的防抖计时器
                if (resizeDebounceTimer) {
                    clearTimeout(resizeDebounceTimer);
                }

                // 防抖：300ms 内多次调整只执行最后一次
                resizeDebounceTimer = setTimeout(() => {
                    // 最小高度 300px，添加小缓冲以避免高度不足
                    const newHeight = Math.max(300, data.height + 2);

                    // 只在高度真正变化时才调整
                    if (Math.abs(newHeight - lastIframeHeight) > 5) {
                        lastIframeHeight = newHeight;
                        iframe.style.height = newHeight + 'px';
                        console.log('✓ iframe 高度已调整:', newHeight + 'px');
                    }
                }, 300);
            }

            // 处理内容保存
            if (data.type === 'contentSaved') {
                console.log('✓ 内容已保存:', data.content);
                showNotification('内容已保存成功！', 'success');
            }

            // 处理错误
            if (data.type === 'error') {
                console.error('✗ 编辑器错误:', data.message);
                showNotification('错误: ' + data.message, 'error');
            }
        };

        window.addEventListener('message', messageHandler);

        // 在原编辑器后插入新编辑器（而不是替换）
        if (targetElement.parentNode) {
            targetElement.parentNode.insertBefore(container, targetElement.nextSibling);
        }

        console.log('✓ 富文本编辑器已加载:', config.editorServerUrl);
        console.log('✓ 监听消息来源:', serverOrigin);
    }

    // 显示通知
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // 添加动画样式、隐藏默认编辑器和编辑器样式
    const style = document.createElement('style');
    style.textContent = `
        .MuiFormControl-fullWidth {
            display: none;
        }
        .ce-block__content {
            position: relative;
            max-width: 100%;
            margin: 0px 1.5rem;
            -webkit-transition: background-color .15s ease;
            transition: background-color .15s ease;
        }
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // 查找并替换编辑器
    function findAndReplaceEditor() {
        const productId = getProductIdFromUrl();
        if (!productId) {
            console.log('未在产品编辑页面，跳过编辑器替换');
            return;
        }

        // 尝试多种选择器来找到描述编辑器
        const selectors = [
            'textarea[name="description"]',
            'div[data-test-id="rich-text-editor-description"]',
            '.ProseMirror',
            '[contenteditable="true"]',
            'textarea[id*="description"]',
            'div[id*="description"]'
        ];

        let targetElement = null;
        for (const selector of selectors) {
            targetElement = document.querySelector(selector);
            if (targetElement) {
                console.log('找到目标编辑器:', selector);
                break;
            }
        }

        if (targetElement) {
            // 等待一下确保页面完全加载
            setTimeout(() => {
                createIframeEditor(targetElement, productId);
            }, 500);
        } else {
            console.log('未找到目标编辑器，将在 DOM 变化时重试');
            // 使用 MutationObserver 监听 DOM 变化
            const observer = new MutationObserver((mutations) => {
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        console.log('DOM 变化后找到目标编辑器:', selector);
                        observer.disconnect();
                        createIframeEditor(element, productId);
                        return;
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // 10秒后停止观察
            setTimeout(() => {
                observer.disconnect();
            }, 10000);
        }
    }

    // 监听 URL 变化（支持 SPA 单页应用）
    let lastUrl = location.href;

    function checkUrlChange() {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            console.log('检测到 URL 变化:', lastUrl, '->', currentUrl);
            lastUrl = currentUrl;

            // URL 变化后延迟执行，等待新页面渲染
            setTimeout(() => {
                findAndReplaceEditor();
            }, 1000);
        }
    }

    // 使用 MutationObserver 监听 URL 变化
    const urlObserver = new MutationObserver(checkUrlChange);
    urlObserver.observe(document.querySelector('title') || document.body, {
        childList: true,
        subtree: true
    });

    // 监听 popstate 事件（浏览器前进/后退）
    window.addEventListener('popstate', () => {
        console.log('检测到浏览器导航（前进/后退）');
        setTimeout(() => {
            findAndReplaceEditor();
        }, 1000);
    });

    // 拦截 pushState 和 replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function() {
        originalPushState.apply(this, arguments);
        console.log('检测到 pushState 导航');
        setTimeout(() => {
            findAndReplaceEditor();
        }, 1000);
    };

    history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        console.log('检测到 replaceState 导航');
        setTimeout(() => {
            findAndReplaceEditor();
        }, 1000);
    };

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', findAndReplaceEditor);
    } else {
        findAndReplaceEditor();
    }

    console.log('Saleor 富文本编辑器增强脚本已加载（支持 SPA 路由）');
})();
