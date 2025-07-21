// 客服系统文档 JavaScript 主文件

// 全局变量
let searchIndex = [];
let currentSearchResults = [];

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
function initializeApp() {
    initializeSearch();
    initializeNavigation();
    initializeScrollEffects();
    initializeAnimations();
    initializeCodeHighlighting();
    initializeOfflineSupport();
}

// 搜索功能初始化
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        searchInput.addEventListener('keydown', handleSearchKeydown);
    }
    
    // 构建搜索索引
    buildSearchIndex();
}

// 构建搜索索引
function buildSearchIndex() {
    // 这里可以从服务器获取搜索索引，或者动态构建
    searchIndex = [
        { title: '快速开始', url: 'user-guide/quick-start.html', keywords: '快速开始,安装,配置,启动' },
        { title: 'API文档', url: 'api/index.html', keywords: 'API,接口,文档,认证,消息' },
        { title: '用户指南', url: 'user-guide/index.html', keywords: '用户指南,使用说明,操作手册' },
        { title: '技术文档', url: 'technical/index.html', keywords: '技术文档,架构,设计,开发' },
        { title: '部署指南', url: 'deployment/index.html', keywords: '部署,安装,配置,生产环境' },
        { title: '认证授权', url: 'api/authentication.html', keywords: '认证,授权,登录,会话' },
        { title: '消息API', url: 'api/messages.html', keywords: '消息,聊天,发送,接收' },
        { title: '系统配置', url: 'user-guide/configuration.html', keywords: '配置,设置,环境变量' },
        { title: '生产部署', url: 'deployment/production.html', keywords: '生产,部署,服务器,优化' },
        { title: '故障排除', url: 'technical/troubleshooting.html', keywords: '故障,问题,解决,调试' }
    ];
}

// 处理搜索
function handleSearch(event) {
    const query = event.target.value.trim().toLowerCase();
    
    if (query.length < 2) {
        hideSearchResults();
        return;
    }
    
    const results = searchIndex.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.keywords.toLowerCase().includes(query)
    );
    
    displaySearchResults(results, query);
}

// 显示搜索结果
function displaySearchResults(results, query) {
    let searchResults = document.getElementById('searchResults');
    
    if (!searchResults) {
        searchResults = document.createElement('div');
        searchResults.id = 'searchResults';
        searchResults.className = 'search-results';
        document.querySelector('.nav-search').appendChild(searchResults);
    }
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">未找到相关结果</div>';
    } else {
        searchResults.innerHTML = results.map(item => `
            <div class="search-result-item" onclick="navigateTo('${item.url}')">
                <div class="result-title">${highlightQuery(item.title, query)}</div>
                <div class="result-keywords">${item.keywords}</div>
            </div>
        `).join('');
    }
    
    searchResults.style.display = 'block';
    currentSearchResults = results;
}

// 隐藏搜索结果
function hideSearchResults() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.style.display = 'none';
    }
}

// 高亮搜索关键词
function highlightQuery(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// 处理搜索键盘事件
function handleSearchKeydown(event) {
    if (event.key === 'Escape') {
        hideSearchResults();
        event.target.blur();
    }
}

// 导航到指定页面
function navigateTo(url) {
    window.location.href = url;
    hideSearchResults();
}

// 导航功能初始化
function initializeNavigation() {
    // 移动端菜单切换
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
    
    // 点击外部关闭菜单
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.nav-container')) {
            navMenu?.classList.remove('active');
            navToggle?.classList.remove('active');
        }
    });
    
    // 平滑滚动到锚点
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// 滚动效果初始化
function initializeScrollEffects() {
    // 返回顶部按钮
    const backToTop = document.getElementById('backToTop');
    
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backToTop?.classList.add('visible');
        } else {
            backToTop?.classList.remove('visible');
        }
    });
    
    // 导航栏滚动效果
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // 向下滚动
            navbar?.classList.add('navbar-hidden');
        } else {
            // 向上滚动
            navbar?.classList.remove('navbar-hidden');
        }
        
        lastScrollTop = scrollTop;
    });
}

// 滚动到顶部
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 动画初始化
function initializeAnimations() {
    // 观察器选项
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    // 创建观察器
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // 观察需要动画的元素
    document.querySelectorAll('.overview-card, .quick-nav-card, .version-item').forEach(el => {
        observer.observe(el);
    });
}

// 代码高亮初始化
function initializeCodeHighlighting() {
    // 如果页面有代码块，应用语法高亮
    const codeBlocks = document.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
        // 这里可以集成 Prism.js 或其他代码高亮库
        block.classList.add('language-rust');
    });
}

// 离线支持初始化
function initializeOfflineSupport() {
    // 检查是否支持 Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
                    console.log('ServiceWorker registration successful');
                })
                .catch(function(err) {
                    console.log('ServiceWorker registration failed');
                });
        });
    }
    
    // 离线状态检测
    window.addEventListener('online', function() {
        showNotification('网络已连接', 'success');
    });
    
    window.addEventListener('offline', function() {
        showNotification('网络已断开，部分功能可能不可用', 'warning');
    });
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 自动移除通知
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 搜索文档（全局函数）
function searchDocs() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim()) {
        handleSearch({ target: searchInput });
    }
}

// 切换菜单（全局函数）
function toggleMenu() {
    const navMenu = document.querySelector('.nav-menu');
    const navToggle = document.querySelector('.nav-toggle');
    
    navMenu?.classList.toggle('active');
    navToggle?.classList.toggle('active');
}

// 主题切换
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // 更新主题图标
    const themeIcon = document.querySelector('.theme-toggle');
    if (themeIcon) {
        themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
}

// 初始化主题
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
}

// 复制代码到剪贴板
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('代码已复制到剪贴板', 'success');
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
        showNotification('代码已复制到剪贴板', 'success');
    } catch (err) {
        showNotification('复制失败', 'error');
    }
    document.body.removeChild(textArea);
}

// 页面加载完成后的额外初始化
window.addEventListener('load', function() {
    initializeTheme();
    
    // 添加代码复制按钮
    document.querySelectorAll('pre').forEach(pre => {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = '复制';
        copyButton.onclick = () => copyToClipboard(pre.textContent);
        pre.appendChild(copyButton);
    });
});

// 导出全局函数
window.navigateTo = navigateTo;
window.scrollToTop = scrollToTop;
window.searchDocs = searchDocs;
window.toggleMenu = toggleMenu;
window.toggleTheme = toggleTheme;
window.copyToClipboard = copyToClipboard;