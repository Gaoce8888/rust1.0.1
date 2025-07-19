// 企业级客服系统技术文档 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 初始化所有功能
    initMobileMenu();
    initSearch();
    initSmoothScrolling();
    initCodeHighlighting();
    initPrintButton();
    initActiveNavigation();
    initScrollToTop();
});

// 移动端菜单切换
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    let overlay = document.querySelector('.sidebar-overlay');
    
    // 如果遮罩层不存在，创建它
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            display: none;
        `;
        document.body.appendChild(overlay);
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            
            // 更新display属性以兼容旧代码
            overlay.style.display = sidebar.classList.contains('active') ? 'block' : 'none';
            
            // 防止背景滚动
            if (sidebar.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        overlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        });
    }

    // 窗口大小改变时自动隐藏侧边栏
    window.addEventListener('resize', function() {
        if (window.innerWidth > 1024) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}

// 搜索功能
function initSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchResults = document.querySelector('.search-results');
    
    if (!searchInput || !searchResults) return;

    // 文档内容索引
    const searchIndex = createSearchIndex();

    searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        
        if (query.length < 2) {
            searchResults.classList.remove('active');
            return;
        }

        const results = searchIndex.filter(item => 
            item.title.toLowerCase().includes(query) ||
            item.content.toLowerCase().includes(query) ||
            item.tags.some(tag => tag.toLowerCase().includes(query))
        );

        displaySearchResults(results, query);
    });

    // 点击外部关闭搜索结果
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
}

// 创建搜索索引
function createSearchIndex() {
    const index = [];
    
    // 从页面内容中提取搜索数据
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        const title = section.querySelector('h2, h3, h4')?.textContent || '';
        const content = section.textContent || '';
        const tags = extractTags(section);
        
        index.push({
            title: title,
            content: content,
            tags: tags,
            url: window.location.pathname + '#' + section.id
        });
    });

    return index;
}

// 提取标签
function extractTags(section) {
    const tags = [];
    const codeBlocks = section.querySelectorAll('code');
    codeBlocks.forEach(code => {
        const text = code.textContent;
        if (text.includes('API') || text.includes('GET') || text.includes('POST')) {
            tags.push('API');
        }
        if (text.includes('Rust') || text.includes('cargo')) {
            tags.push('Rust');
        }
        if (text.includes('WebSocket')) {
            tags.push('WebSocket');
        }
    });
    return tags;
}

// 显示搜索结果
function displaySearchResults(results, query) {
    const searchResults = document.querySelector('.search-results');
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">未找到相关结果</div>';
    } else {
        searchResults.innerHTML = results.slice(0, 10).map(result => `
            <div class="search-result-item" onclick="navigateToResult('${result.url}')">
                <div style="font-weight: 600; margin-bottom: 0.25rem;">${highlightText(result.title, query)}</div>
                <div style="font-size: 0.8rem; color: #666;">${highlightText(result.content.substring(0, 100), query)}...</div>
                <div style="font-size: 0.7rem; color: #999; margin-top: 0.25rem;">
                    ${result.tags.map(tag => `<span style="background: #e9ecef; padding: 0.1rem 0.3rem; border-radius: 3px; margin-right: 0.25rem;">${tag}</span>`).join('')}
                </div>
            </div>
        `).join('');
    }
    
    searchResults.classList.add('active');
}

// 高亮搜索文本
function highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark style="background: #ffeb3b; padding: 0.1rem 0.2rem; border-radius: 2px;">$1</mark>');
}

// 导航到搜索结果
function navigateToResult(url) {
    if (url.startsWith('#')) {
        // 同一页面的锚点
        const element = document.querySelector(url);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        // 其他页面
        window.location.href = url;
    }
    
    // 关闭搜索结果
    document.querySelector('.search-results').classList.remove('active');
    document.querySelector('.search-input').value = '';
}

// 平滑滚动
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // 更新URL
                history.pushState(null, null, '#' + targetId);
            }
        });
    });
}

// 代码高亮
function initCodeHighlighting() {
    // 等待 highlight.js 加载完成
    if (typeof hljs !== 'undefined') {
        hljs.highlightAll();
    } else {
        // 如果 highlight.js 还没加载，等待一下
        setTimeout(() => {
            if (typeof hljs !== 'undefined') {
                hljs.highlightAll();
            }
        }, 1000);
    }
}

// 打印按钮
function initPrintButton() {
    const printBtn = document.querySelector('.print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            window.print();
        });
    }
}

// 活跃导航状态
function initActiveNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    function updateActiveNav() {
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                // 移除所有活跃状态
                navLinks.forEach(link => link.classList.remove('active'));
                
                // 添加活跃状态到当前部分
                const activeLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav(); // 初始化
}

// 回到顶部按钮
function initScrollToTop() {
    const scrollToTopBtn = document.createElement('button');
    scrollToTopBtn.innerHTML = '↑';
    scrollToTopBtn.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        opacity: 0;
        visibility: hidden;
        z-index: 1000;
    `;
    
    document.body.appendChild(scrollToTopBtn);
    
    scrollToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // 显示/隐藏按钮
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            scrollToTopBtn.style.opacity = '1';
            scrollToTopBtn.style.visibility = 'visible';
        } else {
            scrollToTopBtn.style.opacity = '0';
            scrollToTopBtn.style.visibility = 'hidden';
        }
    });
}

// 工具函数：防抖
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

// 工具函数：节流
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

// 性能优化：使用节流处理滚动事件
const throttledScrollHandler = throttle(function() {
    initActiveNavigation();
}, 100);

window.addEventListener('scroll', throttledScrollHandler);

// 错误处理
window.addEventListener('error', function(e) {
    console.error('文档脚本错误:', e.error);
});

// 页面可见性API - 优化性能
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // 页面不可见时暂停一些操作
        console.log('页面不可见，暂停非关键操作');
    } else {
        // 页面可见时恢复操作
        console.log('页面可见，恢复操作');
    }
});