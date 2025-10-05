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

        // 创建容器
        const container = document.createElement('div');
        container.style.cssText = `
            position: relative;
            width: 100%;
            min-height: 400px;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
            background: white;
        `;

        // 创建 iframe
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
            width: 100%;
            height: 400px;
            border: none;
            display: block;
        `;
        iframe.src = `${config.editorServerUrl}/rich-editor?productId=${encodeURIComponent(productId)}`;

        container.appendChild(iframe);

        // 监听来自 iframe 的消息
        window.addEventListener('message', function(event) {
            // 验证消息来源
            if (event.origin !== config.editorServerUrl.replace(/\/$/, '')) {
                return;
            }

            const data = event.data;

            // 处理高度变化
            if (data.type === 'resize' && data.height) {
                iframe.style.height = data.height + 'px';
                console.log('iframe 高度已调整:', data.height);
            }

            // 处理内容保存
            if (data.type === 'contentSaved') {
                console.log('内容已保存:', data.content);
                // 可以在这里添加额外的处理逻辑
                showNotification('内容已保存成功！', 'success');
            }

            // 处理错误
            if (data.type === 'error') {
                console.error('编辑器错误:', data.message);
                showNotification('错误: ' + data.message, 'error');
            }
        });

        // 替换原有编辑器
        targetElement.parentNode.replaceChild(container, targetElement);

        console.log('富文本编辑器已加载:', config.editorServerUrl);
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
            border-radius: 4px;
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

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
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

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', findAndReplaceEditor);
    } else {
        findAndReplaceEditor();
    }

    console.log('Saleor 富文本编辑器增强脚本已加载');
})();
