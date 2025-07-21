// Prism.js 代码高亮库 - 简化版本
// 为客服系统文档提供代码语法高亮功能

(function() {
    'use strict';

    // 语言定义
    const languages = {
        'bash': {
            'comment': /#.*$/gm,
            'string': /"[^"]*"|'[^']*'/g,
            'function': /\b(echo|cat|ls|cd|mkdir|rm|cp|mv|chmod|sudo|apt|curl|git|cargo)\b/g,
            'keyword': /\b(if|then|else|fi|for|while|do|done|case|esac|function)\b/g
        },
        'json': {
            'property': /"([^"]+)":/g,
            'string': /"[^"]*"/g,
            'number': /\b\d+(\.\d+)?\b/g,
            'boolean': /\b(true|false)\b/g,
            'null': /\bnull\b/g
        },
        'toml': {
            'comment': /#.*$/gm,
            'string': /"[^"]*"|'[^']*'/g,
            'number': /\b\d+(\.\d+)?\b/g,
            'boolean': /\b(true|false)\b/g,
            'key': /^[a-zA-Z_][a-zA-Z0-9_]*\s*=/gm
        },
        'rust': {
            'comment': /\/\/.*$|\/\*[\s\S]*?\*\//gm,
            'string': /"[^"]*"|'[^']*'/g,
            'number': /\b\d+(\.\d+)?\b/g,
            'keyword': /\b(fn|let|mut|const|static|if|else|match|loop|while|for|in|return|break|continue|pub|struct|enum|impl|trait|use|mod|crate|extern|unsafe|async|await)\b/g,
            'function': /\b[a-zA-Z_][a-zA-Z0-9_]*\s*\(/g,
            'lifetime': /'[a-zA-Z_][a-zA-Z0-9_]*/g,
            'macro': /\b[a-zA-Z_][a-zA-Z0-9_]*!/g
        },
        'http': {
            'method': /\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/g,
            'url': /https?:\/\/[^\s]+/g,
            'header': /^[A-Za-z-]+:/gm,
            'string': /"[^"]*"/g
        },
        'nginx': {
            'comment': /#.*$/gm,
            'directive': /^[a-zA-Z_][a-zA-Z0-9_]*/gm,
            'string': /"[^"]*"|'[^']*'/g,
            'number': /\b\d+\b/g
        },
        'conf': {
            'comment': /#.*$/gm,
            'string': /"[^"]*"|'[^']*'/g,
            'number': /\b\d+\b/g,
            'keyword': /\b(maxmemory|maxmemory-policy|save|tcp-keepalive)\b/g
        }
    };

    // 高亮函数
    function highlight(code, language) {
        if (!languages[language]) {
            return code;
        }

        let highlighted = code;
        const rules = languages[language];

        // 应用语法高亮规则
        for (const [tokenType, pattern] of Object.entries(rules)) {
            highlighted = highlighted.replace(pattern, (match) => {
                return `<span class="token ${tokenType}">${match}</span>`;
            });
        }

        return highlighted;
    }

    // 处理代码块
    function processCodeBlocks() {
        const codeBlocks = document.querySelectorAll('pre code[class*="language-"]');
        
        codeBlocks.forEach(block => {
            const language = block.className.match(/language-(\w+)/)?.[1];
            if (language && languages[language]) {
                const highlighted = highlight(block.textContent, language);
                block.innerHTML = highlighted;
            }
        });
    }

    // 添加复制按钮
    function addCopyButtons() {
        const codeBlocks = document.querySelectorAll('pre');
        
        codeBlocks.forEach(pre => {
            if (!pre.querySelector('.copy-button')) {
                const copyButton = document.createElement('button');
                copyButton.className = 'copy-button';
                copyButton.textContent = '复制';
                copyButton.onclick = () => copyToClipboard(pre.textContent);
                pre.appendChild(copyButton);
            }
        });
    }

    // 复制到剪贴板
    function copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showCopyNotification('代码已复制到剪贴板');
            }).catch(() => {
                fallbackCopyToClipboard(text);
            });
        } else {
            fallbackCopyToClipboard(text);
        }
    }

    // 备用复制方法
    function fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showCopyNotification('代码已复制到剪贴板');
        } catch (err) {
            showCopyNotification('复制失败');
        }
        document.body.removeChild(textArea);
    }

    // 显示复制通知
    function showCopyNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    // 添加动画样式
    function addAnimationStyles() {
        if (!document.getElementById('prism-animations')) {
            const style = document.createElement('style');
            style.id = 'prism-animations';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
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
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 初始化
    function init() {
        addAnimationStyles();
        processCodeBlocks();
        addCopyButtons();
    }

    // 导出API
    window.Prism = {
        highlight: highlight,
        highlightAll: processCodeBlocks,
        languages: languages
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 监听动态内容变化
    if (window.MutationObserver) {
        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.querySelector && node.querySelector('pre code[class*="language-"]')) {
                                shouldProcess = true;
                                break;
                            }
                        }
                    }
                }
            });
            
            if (shouldProcess) {
                processCodeBlocks();
                addCopyButtons();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

})();