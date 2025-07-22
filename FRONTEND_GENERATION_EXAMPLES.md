# 前端代码生成功能实现示例

本文档展示如何为每个功能创建独立的JavaScript文件，实现后端生成前端代码的各种功能。

## 1. 模板创建功能 (template-creator.js)

```javascript
// template-creator.js - 模板创建功能
class TemplateCreator {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
    }

    // 创建HTML模板
    async createTemplate(templateData) {
        const template = {
            name: templateData.name,
            description: templateData.description,
            category: templateData.category || 'general',
            content: templateData.htmlContent,
            css: templateData.cssContent,
            javascript: templateData.jsContent,
            variables: templateData.variables || [],
            tags: templateData.tags || [],
            created_by: templateData.userId
        };

        try {
            const response = await fetch(`${this.apiUrl}/api/template/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify(template)
            });

            const result = await response.json();
            if (result.success) {
                console.log('模板创建成功:', result.data);
                return result.data;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('模板创建失败:', error);
            throw error;
        }
    }

    // 定义模板变量
    defineVariables(variables) {
        return variables.map(v => ({
            name: v.name,
            var_type: v.type || 'String',
            default_value: v.defaultValue,
            required: v.required || false,
            description: v.description,
            validation: v.validation
        }));
    }

    getToken() {
        return localStorage.getItem('auth_token');
    }
}

// 使用示例
const creator = new TemplateCreator('http://localhost:6006');
creator.createTemplate({
    name: '欢迎消息模板',
    description: '新用户欢迎消息',
    htmlContent: '<div class="welcome">欢迎 {{userName}}！</div>',
    cssContent: '.welcome { color: #333; font-size: 18px; }',
    jsContent: 'console.log("Welcome message rendered");',
    variables: [
        { name: 'userName', type: 'String', required: true }
    ],
    userId: 'admin'
});
```

## 2. 模板渲染功能 (template-renderer.js)

```javascript
// template-renderer.js - 模板渲染功能
class TemplateRenderer {
    constructor(apiUrl, wsUrl) {
        this.apiUrl = apiUrl;
        this.wsUrl = wsUrl;
        this.ws = null;
    }

    // 渲染模板
    async renderTemplate(templateId, variables) {
        const renderRequest = {
            template_id: templateId,
            variables: variables,
            user_id: this.getCurrentUserId(),
            callback_url: `${this.apiUrl}/api/template/callback`
        };

        try {
            const response = await fetch(`${this.apiUrl}/api/template/render`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify(renderRequest)
            });

            const result = await response.json();
            if (result.success) {
                return {
                    html: result.data.rendered_html,
                    css: result.data.rendered_css,
                    js: result.data.rendered_js,
                    messageId: result.data.message_id
                };
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('模板渲染失败:', error);
            throw error;
        }
    }

    // 通过WebSocket发送渲染后的模板
    sendRenderedTemplate(templateId, variables, toUserId) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.connectWebSocket();
        }

        const message = {
            type: 'HtmlTemplate',
            template_id: templateId,
            template_name: 'Dynamic Template',
            from: this.getCurrentUserId(),
            to: toUserId,
            variables: variables,
            timestamp: new Date().toISOString()
        };

        this.ws.send(JSON.stringify(message));
    }

    // 在页面中显示渲染结果
    displayRenderedContent(containerId, renderedContent) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // 注入CSS
        if (renderedContent.css) {
            const style = document.createElement('style');
            style.textContent = renderedContent.css;
            document.head.appendChild(style);
        }

        // 注入HTML
        container.innerHTML = renderedContent.html;

        // 执行JavaScript
        if (renderedContent.js) {
            const script = document.createElement('script');
            script.textContent = renderedContent.js;
            document.body.appendChild(script);
        }
    }

    connectWebSocket() {
        this.ws = new WebSocket(this.wsUrl);
        this.ws.onopen = () => console.log('WebSocket连接成功');
        this.ws.onmessage = (event) => this.handleMessage(JSON.parse(event.data));
    }

    handleMessage(message) {
        if (message.type === 'HtmlTemplate') {
            this.displayRenderedContent('message-container', {
                html: message.rendered_html,
                css: message.rendered_css,
                js: message.rendered_js
            });
        }
    }

    getCurrentUserId() {
        return localStorage.getItem('user_id');
    }

    getToken() {
        return localStorage.getItem('auth_token');
    }
}

// 使用示例
const renderer = new TemplateRenderer('http://localhost:6006', 'ws://localhost:6006/ws');
renderer.renderTemplate('template-123', {
    userName: '张三',
    welcomeMessage: '欢迎使用我们的服务！'
});
```

## 3. 模板管理功能 (template-manager.js)

```javascript
// template-manager.js - 模板管理功能
class TemplateManager {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.templates = new Map();
    }

    // 获取模板列表
    async listTemplates(filters = {}) {
        const params = new URLSearchParams({
            page: filters.page || 0,
            limit: filters.limit || 20,
            category: filters.category || '',
            search: filters.search || '',
            sort_by: filters.sortBy || 'created_at',
            sort_order: filters.sortOrder || 'desc'
        });

        try {
            const response = await fetch(`${this.apiUrl}/api/template/list?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            const result = await response.json();
            if (result.success) {
                result.data.templates.forEach(template => {
                    this.templates.set(template.id, template);
                });
                return result.data;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('获取模板列表失败:', error);
            throw error;
        }
    }

    // 获取单个模板
    async getTemplate(templateId) {
        if (this.templates.has(templateId)) {
            return this.templates.get(templateId);
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/template/${templateId}`, {
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            const result = await response.json();
            if (result.success) {
                this.templates.set(templateId, result.data);
                return result.data;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('获取模板失败:', error);
            throw error;
        }
    }

    // 更新模板
    async updateTemplate(templateId, updates) {
        try {
            const response = await fetch(`${this.apiUrl}/api/template/${templateId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify(updates)
            });

            const result = await response.json();
            if (result.success) {
                this.templates.set(templateId, result.data);
                return result.data;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('更新模板失败:', error);
            throw error;
        }
    }

    // 删除模板
    async deleteTemplate(templateId) {
        try {
            const response = await fetch(`${this.apiUrl}/api/template/${templateId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            const result = await response.json();
            if (result.success) {
                this.templates.delete(templateId);
                return true;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('删除模板失败:', error);
            throw error;
        }
    }

    // 获取模板统计
    async getStatistics() {
        try {
            const response = await fetch(`${this.apiUrl}/api/template/statistics`, {
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            const result = await response.json();
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('获取统计失败:', error);
            throw error;
        }
    }

    getToken() {
        return localStorage.getItem('auth_token');
    }
}

// 使用示例
const manager = new TemplateManager('http://localhost:6006');
manager.listTemplates({ category: 'marketing', limit: 10 });
```

## 4. 模板预览功能 (template-preview.js)

```javascript
// template-preview.js - 模板预览功能
class TemplatePreview {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.previewWindow = null;
    }

    // 预览模板
    async previewTemplate(templateId, customVariables = null) {
        try {
            const url = customVariables 
                ? `${this.apiUrl}/api/template/${templateId}/preview`
                : `${this.apiUrl}/api/template/${templateId}/preview?use_defaults=true`;

            const response = await fetch(url, {
                method: customVariables ? 'POST' : 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: customVariables ? JSON.stringify({ variables: customVariables }) : undefined
            });

            const previewHtml = await response.text();
            this.displayPreview(previewHtml);
            return previewHtml;
        } catch (error) {
            console.error('预览模板失败:', error);
            throw error;
        }
    }

    // 在新窗口中显示预览
    displayPreview(htmlContent) {
        if (this.previewWindow && !this.previewWindow.closed) {
            this.previewWindow.close();
        }

        this.previewWindow = window.open('', 'template-preview', 'width=800,height=600');
        this.previewWindow.document.write(htmlContent);
        this.previewWindow.document.close();
    }

    // 在iframe中显示预览
    displayInIframe(iframeId, htmlContent) {
        const iframe = document.getElementById(iframeId);
        if (!iframe) return;

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();
    }

    // 实时预览（编辑时）
    setupLivePreview(editorId, previewId) {
        const editor = document.getElementById(editorId);
        const preview = document.getElementById(previewId);
        
        if (!editor || !preview) return;

        let debounceTimer;
        editor.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.updateLivePreview(editor.value, preview);
            }, 500);
        });
    }

    updateLivePreview(templateContent, previewElement) {
        try {
            // 简单的变量替换预览
            const previewContent = templateContent.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
                return `<span class="template-var">[${varName}]</span>`;
            });
            
            previewElement.innerHTML = previewContent;
        } catch (error) {
            previewElement.innerHTML = '<div class="error">预览错误</div>';
        }
    }

    getToken() {
        return localStorage.getItem('auth_token');
    }
}

// 使用示例
const preview = new TemplatePreview('http://localhost:6006');
preview.previewTemplate('template-123', {
    userName: '预览用户',
    date: new Date().toLocaleDateString()
});
```

## 5. 回调处理功能 (template-callback.js)

```javascript
// template-callback.js - 模板回调处理功能
class TemplateCallbackHandler {
    constructor(apiUrl, wsUrl) {
        this.apiUrl = apiUrl;
        this.wsUrl = wsUrl;
        this.callbacks = new Map();
        this.ws = null;
    }

    // 注册回调处理器
    registerCallback(elementId, action, handler) {
        const key = `${elementId}:${action}`;
        this.callbacks.set(key, handler);
    }

    // 初始化回调监听
    initializeCallbacks(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // 事件委托处理所有回调
        container.addEventListener('click', (event) => {
            const target = event.target;
            const callbackId = target.getAttribute('data-callback-id');
            const action = target.getAttribute('data-action') || 'click';
            
            if (callbackId) {
                this.handleCallback(callbackId, action, target);
            }
        });

        // 监听其他事件类型
        ['change', 'submit', 'focus', 'blur'].forEach(eventType => {
            container.addEventListener(eventType, (event) => {
                const target = event.target;
                const callbackId = target.getAttribute('data-callback-id');
                
                if (callbackId && target.getAttribute(`data-${eventType}-action`)) {
                    this.handleCallback(callbackId, eventType, target);
                }
            });
        });
    }

    // 处理回调
    async handleCallback(elementId, action, element) {
        const messageId = element.getAttribute('data-message-id');
        const templateId = element.getAttribute('data-template-id');
        const callbackData = this.extractCallbackData(element);

        // 发送回调到服务器
        const callbackRequest = {
            message_id: messageId,
            template_id: templateId,
            action: action,
            element_id: elementId,
            callback_data: callbackData,
            user_id: this.getCurrentUserId(),
            user_agent: navigator.userAgent,
            ip_address: 'client'
        };

        try {
            // 通过API发送回调
            const response = await fetch(`${this.apiUrl}/api/template/callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify(callbackRequest)
            });

            const result = await response.json();
            
            // 通过WebSocket发送回调消息
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'HtmlCallback',
                    ...callbackRequest,
                    timestamp: new Date().toISOString()
                }));
            }

            // 执行本地回调处理器
            const key = `${elementId}:${action}`;
            if (this.callbacks.has(key)) {
                const handler = this.callbacks.get(key);
                handler(callbackData, element);
            }

            return result;
        } catch (error) {
            console.error('处理回调失败:', error);
            throw error;
        }
    }

    // 提取回调数据
    extractCallbackData(element) {
        const data = {};
        
        // 获取所有data-*属性
        for (let attr of element.attributes) {
            if (attr.name.startsWith('data-') && 
                !['data-callback-id', 'data-message-id', 'data-template-id', 'data-action'].includes(attr.name)) {
                const key = attr.name.replace('data-', '').replace(/-/g, '_');
                data[key] = attr.value;
            }
        }

        // 获取表单数据
        if (element.tagName === 'FORM') {
            const formData = new FormData(element);
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
        }

        // 获取输入值
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) {
            data.value = element.value;
        }

        return data;
    }

    // 连接WebSocket
    connectWebSocket() {
        this.ws = new WebSocket(this.wsUrl);
        this.ws.onopen = () => console.log('回调WebSocket连接成功');
        this.ws.onerror = (error) => console.error('回调WebSocket错误:', error);
    }

    getCurrentUserId() {
        return localStorage.getItem('user_id');
    }

    getToken() {
        return localStorage.getItem('auth_token');
    }
}

// 使用示例
const callbackHandler = new TemplateCallbackHandler('http://localhost:6006', 'ws://localhost:6006/ws');
callbackHandler.initializeCallbacks('message-container');
callbackHandler.registerCallback('btn-submit', 'click', (data, element) => {
    console.log('提交按钮被点击', data);
});
```

## 6. 富文本消息功能 (rich-message.js)

```javascript
// rich-message.js - 富文本消息功能
class RichMessageHandler {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.messageHandlers = new Map();
    }

    // 发送富文本消息
    sendRichMessage(toUserId, content) {
        const message = {
            type: 'Chat',
            from: this.getCurrentUserId(),
            to: toUserId,
            content: content.text || '',
            content_type: 'Html',
            timestamp: new Date().toISOString()
        };

        // 如果是HTML模板消息
        if (content.templateId) {
            message.type = 'HtmlTemplate';
            message.template_id = content.templateId;
            message.variables = content.variables || {};
            message.rendered_html = content.html;
        }

        this.sendMessage(message);
    }

    // 创建交互式卡片消息
    createCardMessage(cardData) {
        const html = `
            <div class="message-card">
                <div class="card-header">
                    <h3>${cardData.title}</h3>
                    ${cardData.subtitle ? `<p>${cardData.subtitle}</p>` : ''}
                </div>
                ${cardData.image ? `<img src="${cardData.image}" alt="${cardData.title}">` : ''}
                <div class="card-body">
                    ${cardData.content}
                </div>
                <div class="card-actions">
                    ${cardData.actions.map(action => `
                        <button 
                            data-callback-id="${action.id}"
                            data-action="${action.action}"
                            data-message-id="${this.generateId()}"
                            class="action-button ${action.style || 'primary'}"
                        >
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        const css = `
            .message-card {
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 16px;
                margin: 8px 0;
                background: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .card-header h3 {
                margin: 0 0 8px 0;
                color: #333;
            }
            .card-header p {
                margin: 0;
                color: #666;
                font-size: 14px;
            }
            .message-card img {
                width: 100%;
                height: auto;
                border-radius: 4px;
                margin: 12px 0;
            }
            .card-actions {
                display: flex;
                gap: 8px;
                margin-top: 16px;
            }
            .action-button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s;
            }
            .action-button.primary {
                background: #007bff;
                color: white;
            }
            .action-button.primary:hover {
                background: #0056b3;
            }
        `;

        return { html, css };
    }

    // 创建表单消息
    createFormMessage(formData) {
        const formId = this.generateId();
        const html = `
            <form class="message-form" data-callback-id="${formId}" data-submit-action="submit">
                <h3>${formData.title}</h3>
                ${formData.fields.map(field => this.createFormField(field)).join('')}
                <button type="submit" class="submit-button">
                    ${formData.submitLabel || '提交'}
                </button>
            </form>
        `;

        const css = `
            .message-form {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 8px 0;
            }
            .form-field {
                margin-bottom: 16px;
            }
            .form-field label {
                display: block;
                margin-bottom: 4px;
                font-weight: 500;
                color: #333;
            }
            .form-field input,
            .form-field select,
            .form-field textarea {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            .submit-button {
                background: #28a745;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
            }
            .submit-button:hover {
                background: #218838;
            }
        `;

        return { html, css, formId };
    }

    // 创建表单字段
    createFormField(field) {
        const fieldHtml = {
            text: `
                <div class="form-field">
                    <label for="${field.name}">${field.label}</label>
                    <input type="text" id="${field.name}" name="${field.name}" 
                           ${field.required ? 'required' : ''} 
                           ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}>
                </div>
            `,
            email: `
                <div class="form-field">
                    <label for="${field.name}">${field.label}</label>
                    <input type="email" id="${field.name}" name="${field.name}" 
                           ${field.required ? 'required' : ''} 
                           ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}>
                </div>
            `,
            select: `
                <div class="form-field">
                    <label for="${field.name}">${field.label}</label>
                    <select id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''}>
                        ${field.options.map(opt => 
                            `<option value="${opt.value}">${opt.label}</option>`
                        ).join('')}
                    </select>
                </div>
            `,
            textarea: `
                <div class="form-field">
                    <label for="${field.name}">${field.label}</label>
                    <textarea id="${field.name}" name="${field.name}" rows="4" 
                              ${field.required ? 'required' : ''} 
                              ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}></textarea>
                </div>
            `
        };

        return fieldHtml[field.type] || fieldHtml.text;
    }

    // 注册消息处理器
    registerMessageHandler(messageType, handler) {
        this.messageHandlers.set(messageType, handler);
    }

    // 连接WebSocket
    connect() {
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            // 处理富文本消息
            if (message.content_type === 'Html' || message.type === 'HtmlTemplate') {
                this.handleRichMessage(message);
            }
            
            // 调用注册的处理器
            if (this.messageHandlers.has(message.type)) {
                const handler = this.messageHandlers.get(message.type);
                handler(message);
            }
        };
    }

    // 处理富文本消息
    handleRichMessage(message) {
        const container = document.getElementById('message-container');
        if (!container) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'rich-message';
        messageElement.innerHTML = message.rendered_html || message.content;
        
        container.appendChild(messageElement);
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    getCurrentUserId() {
        return localStorage.getItem('user_id');
    }

    generateId() {
        return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}

// 使用示例
const richMessage = new RichMessageHandler('ws://localhost:6006/ws');
richMessage.connect();

// 发送卡片消息
const cardContent = richMessage.createCardMessage({
    title: '产品推荐',
    subtitle: '为您推荐的热门产品',
    image: 'https://example.com/product.jpg',
    content: '这是一款非常受欢迎的产品，现在购买享受优惠！',
    actions: [
        { id: 'buy-now', label: '立即购买', action: 'buy', style: 'primary' },
        { id: 'learn-more', label: '了解更多', action: 'info', style: 'secondary' }
    ]
});

richMessage.sendRichMessage('customer-123', cardContent);
```

## 7. 模板变量处理功能 (template-variables.js)

```javascript
// template-variables.js - 模板变量处理功能
class TemplateVariableProcessor {
    constructor() {
        this.validators = new Map();
        this.transformers = new Map();
        this.setupDefaultValidators();
        this.setupDefaultTransformers();
    }

    // 设置默认验证器
    setupDefaultValidators() {
        // 字符串验证
        this.validators.set('String', (value, validation) => {
            if (typeof value !== 'string') return false;
            if (validation) {
                const regex = new RegExp(validation);
                return regex.test(value);
            }
            return true;
        });

        // 数字验证
        this.validators.set('Number', (value, validation) => {
            if (typeof value !== 'number') return false;
            if (validation) {
                const [min, max] = validation.split(',').map(Number);
                return value >= min && value <= max;
            }
            return true;
        });

        // 邮箱验证
        this.validators.set('Email', (value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
        });

        // URL验证
        this.validators.set('Url', (value) => {
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        });

        // 日期验证
        this.validators.set('Date', (value) => {
            const date = new Date(value);
            return !isNaN(date.getTime());
        });
    }

    // 设置默认转换器
    setupDefaultTransformers() {
        // 日期格式化
        this.transformers.set('dateFormat', (value, format = 'YYYY-MM-DD') => {
            const date = new Date(value);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            return format
                .replace('YYYY', year)
                .replace('MM', month)
                .replace('DD', day);
        });

        // 货币格式化
        this.transformers.set('currency', (value, currency = 'CNY') => {
            const formatter = new Intl.NumberFormat('zh-CN', {
                style: 'currency',
                currency: currency
            });
            return formatter.format(value);
        });

        // 大小写转换
        this.transformers.set('uppercase', (value) => value.toUpperCase());
        this.transformers.set('lowercase', (value) => value.toLowerCase());
        this.transformers.set('capitalize', (value) => 
            value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
        );

        // 数字格式化
        this.transformers.set('numberFormat', (value, decimals = 2) => {
            return Number(value).toFixed(decimals);
        });
    }

    // 验证变量
    validateVariable(variable, value) {
        const validator = this.validators.get(variable.var_type);
        if (!validator) return true;

        return validator(value, variable.validation);
    }

    // 验证所有变量
    validateVariables(templateVariables, providedVariables) {
        const errors = [];

        for (const variable of templateVariables) {
            // 检查必需变量
            if (variable.required && !(variable.name in providedVariables)) {
                errors.push({
                    field: variable.name,
                    message: `缺少必需变量: ${variable.name}`
                });
                continue;
            }

            // 验证变量值
            if (variable.name in providedVariables) {
                const value = providedVariables[variable.name];
                if (!this.validateVariable(variable, value)) {
                    errors.push({
                        field: variable.name,
                        message: `变量 ${variable.name} 验证失败`
                    });
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // 处理变量默认值
    applyDefaults(templateVariables, providedVariables) {
        const variables = { ...providedVariables };

        for (const variable of templateVariables) {
            if (!(variable.name in variables) && variable.default_value !== null) {
                variables[variable.name] = variable.default_value;
            }
        }

        return variables;
    }

    // 转换变量值
    transformVariable(value, transformations) {
        let result = value;

        for (const transformation of transformations) {
            const [transformerName, ...args] = transformation.split(':');
            const transformer = this.transformers.get(transformerName);
            
            if (transformer) {
                result = transformer(result, ...args);
            }
        }

        return result;
    }

    // 渲染模板内容
    renderTemplate(template, variables) {
        let content = template;

        // 处理简单变量替换
        content = content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            return variables[varName] || match;
        });

        // 处理带转换的变量
        content = content.replace(/\{\{(\w+)\|([^}]+)\}\}/g, (match, varName, transformations) => {
            const value = variables[varName];
            if (value === undefined) return match;

            const transforms = transformations.split('|').map(t => t.trim());
            return this.transformVariable(value, transforms);
        });

        // 处理条件语句
        content = this.processConditionals(content, variables);

        // 处理循环语句
        content = this.processLoops(content, variables);

        return content;
    }

    // 处理条件语句
    processConditionals(content, variables) {
        const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
        
        return content.replace(conditionalRegex, (match, varName, innerContent) => {
            const value = variables[varName];
            return value ? innerContent : '';
        });
    }

    // 处理循环语句
    processLoops(content, variables) {
        const loopRegex = /\{\{#each\s+(\w+)\s+as\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
        
        return content.replace(loopRegex, (match, arrayName, itemName, innerContent) => {
            const array = variables[arrayName];
            if (!Array.isArray(array)) return '';

            return array.map(item => {
                const itemVars = { ...variables, [itemName]: item };
                return this.renderTemplate(innerContent, itemVars);
            }).join('');
        });
    }

    // 注册自定义验证器
    registerValidator(type, validator) {
        this.validators.set(type, validator);
    }

    // 注册自定义转换器
    registerTransformer(name, transformer) {
        this.transformers.set(name, transformer);
    }
}

// 使用示例
const processor = new TemplateVariableProcessor();

// 模板变量定义
const templateVariables = [
    {
        name: 'userName',
        var_type: 'String',
        required: true,
        validation: '^[a-zA-Z\\s]+$'
    },
    {
        name: 'orderAmount',
        var_type: 'Number',
        required: true,
        validation: '0,999999'
    },
    {
        name: 'orderDate',
        var_type: 'Date',
        default_value: new Date().toISOString()
    }
];

// 提供的变量值
const providedVariables = {
    userName: 'John Doe',
    orderAmount: 1234.56
};

// 验证变量
const validation = processor.validateVariables(templateVariables, providedVariables);
console.log('验证结果:', validation);

// 应用默认值
const finalVariables = processor.applyDefaults(templateVariables, providedVariables);

// 渲染模板
const template = `
<div>
    <h1>欢迎, {{userName|capitalize}}!</h1>
    <p>您的订单金额: {{orderAmount|currency}}</p>
    <p>订单日期: {{orderDate|dateFormat:YYYY-MM-DD}}</p>
    
    {{#if hasDiscount}}
        <p>恭喜！您享受了优惠！</p>
    {{/if}}
    
    {{#each products as product}}
        <div>{{product.name}} - {{product.price|currency}}</div>
    {{/each}}
</div>
`;

const rendered = processor.renderTemplate(template, finalVariables);
console.log('渲染结果:', rendered);
```

## 总结

以上示例展示了后端生成前端代码的各个功能模块，每个功能都用一个独立的JavaScript文件实现：

1. **template-creator.js** - 创建和定义HTML模板
2. **template-renderer.js** - 渲染模板并通过WebSocket发送
3. **template-manager.js** - 管理模板的CRUD操作
4. **template-preview.js** - 预览模板效果
5. **template-callback.js** - 处理模板交互回调
6. **rich-message.js** - 处理富文本消息和交互式内容
7. **template-variables.js** - 处理模板变量验证和转换

每个模块都可以独立使用，也可以组合使用来实现复杂的功能。这种模块化的设计使得代码更易维护和扩展。