// 主要JavaScript功能

// 导航菜单切换
function toggleMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('active');
}

// 搜索功能
function searchDocs() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (query) {
        // 这里可以实现搜索逻辑
        console.log('搜索:', query);
        // 可以跳转到搜索结果页面或显示搜索结果
    }
}

// 返回顶部功能
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 滚动监听
window.addEventListener('scroll', function() {
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        if (window.pageYOffset > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    }
    
    // 导航栏滚动效果
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.pageYOffset > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// 平滑滚动到锚点
function smoothScrollToAnchor() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offsetTop = target.offsetTop - 80; // 考虑固定导航栏高度
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// 动画观察器
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // 观察需要动画的元素
    const animatedElements = document.querySelectorAll('.feature-card, .metric-card, .doc-card, .tech-item');
    animatedElements.forEach(el => {
        observer.observe(el);
    });
}

// 表单处理
function initForms() {
    // 咨询表单处理
    const consultationForm = document.querySelector('.consultation-form');
    if (consultationForm) {
        consultationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 获取表单数据
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // 这里可以添加表单验证
            if (!data.name || !data.email || !data.type || !data.message) {
                alert('请填写所有必填字段');
                return;
            }
            
            // 模拟表单提交
            console.log('表单数据:', data);
            
            // 显示成功消息
            alert('感谢您的咨询！我们会尽快与您联系。');
            
            // 重置表单
            this.reset();
        });
    }
}

// 代码高亮初始化
function initCodeHighlighting() {
    // 如果页面有代码块，初始化语法高亮
    const codeBlocks = document.querySelectorAll('pre code');
    if (codeBlocks.length > 0 && typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
}

// 复制代码功能
function initCodeCopy() {
    document.querySelectorAll('.code-block').forEach(block => {
        const copyBtn = block.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', function() {
                const code = block.querySelector('code');
                if (code) {
                    navigator.clipboard.writeText(code.textContent).then(() => {
                        // 显示复制成功提示
                        const originalText = this.textContent;
                        this.textContent = '已复制!';
                        this.classList.add('copied');
                        
                        setTimeout(() => {
                            this.textContent = originalText;
                            this.classList.remove('copied');
                        }, 2000);
                    }).catch(err => {
                        console.error('复制失败:', err);
                        alert('复制失败，请手动复制');
                    });
                }
            });
        }
    });
}

// 标签页切换
function initTabs() {
    document.querySelectorAll('.tab-nav').forEach(tabNav => {
        const tabs = tabNav.querySelectorAll('.tab-btn');
        const tabContents = tabNav.parentElement.querySelectorAll('.tab-content');
        
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', function() {
                // 移除所有活动状态
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // 添加当前活动状态
                this.classList.add('active');
                if (tabContents[index]) {
                    tabContents[index].classList.add('active');
                }
            });
        });
    });
}

// 搜索建议功能
function initSearchSuggestions() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length > 2) {
                searchTimeout = setTimeout(() => {
                    // 这里可以实现搜索建议逻辑
                    console.log('搜索建议:', query);
                }, 300);
            }
        });
    }
}

// 主题切换功能
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // 更新图标
            this.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
        });
    }
}

// 移动端导航处理
function initMobileNav() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        // 点击导航链接时关闭移动端菜单
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
        
        // 点击外部区域关闭菜单
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
            }
        });
    }
}

// 性能监控
function initPerformanceMonitoring() {
    // 页面加载性能
    window.addEventListener('load', () => {
        if ('performance' in window) {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('页面加载时间:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
        }
    });
    
    // 错误监控
    window.addEventListener('error', (e) => {
        console.error('页面错误:', e.error);
        // 这里可以发送错误报告到服务器
    });
}

// 离线支持
function initOfflineSupport() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker 注册成功:', registration);
            })
            .catch(error => {
                console.log('Service Worker 注册失败:', error);
            });
    }
}

// 键盘快捷键
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K 打开搜索
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // ESC 关闭移动端菜单
        if (e.key === 'Escape') {
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
            }
        }
    });
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI客服系统文档页面加载完成');
    
    // 初始化所有功能
    smoothScrollToAnchor();
    initAnimations();
    initForms();
    initCodeHighlighting();
    initCodeCopy();
    initTabs();
    initSearchSuggestions();
    initThemeToggle();
    initMobileNav();
    initPerformanceMonitoring();
    initOfflineSupport();
    initKeyboardShortcuts();
    
    // 设置主题
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // 更新主题切换按钮
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = savedTheme === 'dark' ? '☀️' : '🌙';
    }
});

// 页面可见性变化处理
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('页面隐藏');
    } else {
        console.log('页面显示');
    }
});

// 窗口大小变化处理
window.addEventListener('resize', function() {
    // 重新计算布局
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu && window.innerWidth > 768) {
        navMenu.classList.remove('active');
    }
});

// 导出函数供其他脚本使用
window.DocsApp = {
    toggleMenu,
    searchDocs,
    scrollToTop,
    smoothScrollToAnchor,
    initAnimations,
    initForms,
    initCodeHighlighting,
    initCodeCopy,
    initTabs,
    initSearchSuggestions,
    initThemeToggle,
    initMobileNav,
    initPerformanceMonitoring,
    initOfflineSupport,
    initKeyboardShortcuts
};