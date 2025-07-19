// 企业级客服系统 - 移动端深度优化 JavaScript

// 移动端功能初始化
document.addEventListener('DOMContentLoaded', function() {
    if (isMobile()) {
        initMobileOptimizations();
        initTouchGestures();
        initMobileSearch();
        initMobilePerformance();
        initMobileInteractions();
        initMobileNavigation();
    }
});

// 检测移动设备
function isMobile() {
    return window.matchMedia('(max-width: 1024px)').matches || 
           'ontouchstart' in window ||
           navigator.maxTouchPoints > 0;
}

// 移动端基础优化
function initMobileOptimizations() {
    // 禁用双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // iOS 橡皮筋效果优化
    document.body.addEventListener('touchmove', function(e) {
        if (e.target.closest('.sidebar') || e.target.closest('pre')) {
            return; // 允许这些元素滚动
        }
        
        const scrollable = e.target.closest('.content, .main-content');
        if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
            return; // 允许内容区域滚动
        }
        
        if (document.body.scrollHeight <= window.innerHeight) {
            e.preventDefault(); // 防止整页橡皮筋效果
        }
    }, { passive: false });

    // 改进的 viewport 高度处理（解决移动端浏览器地址栏问题）
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    setViewportHeight();
    window.addEventListener('resize', debounce(setViewportHeight, 100));
    window.addEventListener('orientationchange', setViewportHeight);
}

// 触摸手势支持
function initTouchGestures() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay') || createOverlay();
    let touchStartX = 0;
    let touchEndX = 0;
    let isSwiping = false;

    // 创建遮罩层
    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        return overlay;
    }

    // 左滑关闭侧边栏
    sidebar.addEventListener('touchstart', handleTouchStart, { passive: true });
    sidebar.addEventListener('touchmove', handleTouchMove, { passive: true });
    sidebar.addEventListener('touchend', handleTouchEnd);

    // 右滑打开侧边栏（从屏幕左边缘）
    document.addEventListener('touchstart', function(e) {
        if (e.touches[0].clientX < 20 && !sidebar.classList.contains('active')) {
            touchStartX = e.touches[0].clientX;
            isSwiping = true;
        }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        if (isSwiping && !sidebar.classList.contains('active')) {
            const currentX = e.touches[0].clientX;
            const diffX = currentX - touchStartX;
            
            if (diffX > 50) {
                sidebar.classList.add('active');
                overlay.classList.add('active');
                isSwiping = false;
                
                // 触觉反馈
                if ('vibrate' in navigator) {
                    navigator.vibrate(10);
                }
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', function() {
        isSwiping = false;
    });

    function handleTouchStart(e) {
        touchStartX = e.touches[0].clientX;
    }

    function handleTouchMove(e) {
        if (!sidebar.classList.contains('active')) return;
        
        const currentX = e.touches[0].clientX;
        const diffX = touchStartX - currentX;
        
        // 实时跟随手指移动
        if (diffX > 0) {
            const translateX = Math.min(diffX, sidebar.offsetWidth);
            sidebar.style.transform = `translateX(-${translateX}px)`;
            overlay.style.opacity = 1 - (translateX / sidebar.offsetWidth);
        }
    }

    function handleTouchEnd(e) {
        if (!sidebar.classList.contains('active')) return;
        
        touchEndX = e.changedTouches[0].clientX;
        const diffX = touchStartX - touchEndX;
        
        // 如果滑动距离超过侧边栏宽度的 1/3，则关闭
        if (diffX > sidebar.offsetWidth / 3) {
            closeSidebar();
        } else {
            // 恢复原位
            sidebar.style.transform = '';
            overlay.style.opacity = '';
        }
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        sidebar.style.transform = '';
        overlay.style.opacity = '';
    }

    // 点击遮罩层关闭
    overlay.addEventListener('click', closeSidebar);
}

// 移动端搜索优化
function initMobileSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchResults = document.querySelector('.search-results');
    
    if (!searchInput) return;

    // 优化虚拟键盘行为
    searchInput.addEventListener('focus', function() {
        // 滚动到搜索框
        setTimeout(() => {
            this.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
        
        // 添加搜索激活状态
        document.body.classList.add('search-active');
    });

    searchInput.addEventListener('blur', function() {
        setTimeout(() => {
            document.body.classList.remove('search-active');
        }, 200);
    });

    // 移动端搜索结果优化
    if (searchResults) {
        // 添加触摸滚动
        searchResults.addEventListener('touchstart', function() {
            this.style.overscrollBehavior = 'contain';
        });

        // 搜索结果项触摸反馈
        searchResults.addEventListener('click', function(e) {
            const item = e.target.closest('.search-result-item');
            if (item) {
                item.style.background = '#f0f0f0';
                setTimeout(() => {
                    item.style.background = '';
                }, 200);
            }
        });
    }

    // 快速清除按钮
    const clearButton = document.createElement('button');
    clearButton.className = 'search-clear';
    clearButton.innerHTML = '×';
    clearButton.style.cssText = `
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #999;
        padding: 0.5rem;
        display: none;
        cursor: pointer;
    `;
    
    searchInput.parentElement.appendChild(clearButton);
    
    searchInput.addEventListener('input', function() {
        clearButton.style.display = this.value ? 'block' : 'none';
    });
    
    clearButton.addEventListener('click', function() {
        searchInput.value = '';
        searchInput.focus();
        this.style.display = 'none';
        if (searchResults) {
            searchResults.classList.remove('active');
        }
    });
}

// 移动端性能优化
function initMobilePerformance() {
    // 懒加载图片
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px 0px'
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // 优化滚动性能
    let ticking = false;
    function updateScrollProgress() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                // 更新滚动进度条
                const scrollProgress = document.querySelector('.scroll-progress');
                if (scrollProgress) {
                    const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
                    scrollProgress.style.width = scrollPercent + '%';
                }
                ticking = false;
            });
            ticking = true;
        }
    }

    // 添加滚动进度条
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        width: 0%;
        z-index: 1000;
        transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    // 减少重绘和重排
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.style.willChange = 'transform';
        card.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        });
        card.addEventListener('touchend', function() {
            this.style.transform = '';
        });
    });
}

// 移动端交互优化
function initMobileInteractions() {
    // 改进的按钮交互
    const buttons = document.querySelectorAll('.btn, button');
    buttons.forEach(button => {
        // 添加涟漪效果
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.5);
                left: ${x}px;
                top: ${y}px;
                transform: scale(0);
                animation: rippleEffect 0.6s ease-out;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });

    // 添加涟漪动画
    if (!document.querySelector('#rippleStyles')) {
        const style = document.createElement('style');
        style.id = 'rippleStyles';
        style.textContent = `
            @keyframes rippleEffect {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 长按菜单
    let pressTimer;
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('touchstart', function(e) {
            pressTimer = setTimeout(() => {
                if ('vibrate' in navigator) {
                    navigator.vibrate(50);
                }
                // 可以在这里添加长按菜单功能
                console.log('Long press detected on:', this.textContent);
            }, 500);
        });

        link.addEventListener('touchend', function() {
            clearTimeout(pressTimer);
        });

        link.addEventListener('touchmove', function() {
            clearTimeout(pressTimer);
        });
    });

    // Pull-to-refresh (下拉刷新)
    let pullStartY = 0;
    let isPulling = false;
    const pullThreshold = 80;
    
    const pullIndicator = document.createElement('div');
    pullIndicator.className = 'pull-indicator';
    pullIndicator.innerHTML = '↓ 下拉刷新';
    pullIndicator.style.cssText = `
        position: fixed;
        top: -50px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 0.75rem 1.5rem;
        border-radius: 20px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        transition: top 0.3s ease;
        z-index: 1000;
        font-size: 0.875rem;
    `;
    document.body.appendChild(pullIndicator);

    document.addEventListener('touchstart', function(e) {
        if (window.scrollY === 0) {
            pullStartY = e.touches[0].clientY;
            isPulling = true;
        }
    });

    document.addEventListener('touchmove', function(e) {
        if (!isPulling) return;
        
        const pullDistance = e.touches[0].clientY - pullStartY;
        if (pullDistance > 0 && pullDistance < pullThreshold * 2) {
            e.preventDefault();
            
            if (pullDistance > pullThreshold) {
                pullIndicator.style.top = '10px';
                pullIndicator.innerHTML = '↑ 释放刷新';
            } else {
                pullIndicator.style.top = '-50px';
                pullIndicator.innerHTML = '↓ 下拉刷新';
            }
            
            document.body.style.transform = `translateY(${Math.min(pullDistance / 2, pullThreshold)}px)`;
        }
    }, { passive: false });

    document.addEventListener('touchend', function(e) {
        if (!isPulling) return;
        
        const pullDistance = e.changedTouches[0].clientY - pullStartY;
        if (pullDistance > pullThreshold) {
            pullIndicator.innerHTML = '⟳ 刷新中...';
            setTimeout(() => {
                location.reload();
            }, 500);
        } else {
            pullIndicator.style.top = '-50px';
            document.body.style.transform = '';
        }
        
        isPulling = false;
    });
}

// 移动端导航优化
function initMobileNavigation() {
    // 智能隐藏/显示头部
    let lastScrollY = 0;
    let ticking = false;
    const header = document.querySelector('.header');
    
    function updateHeader() {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            // 向下滚动 - 隐藏
            header.style.transform = 'translateY(-100%)';
        } else {
            // 向上滚动 - 显示
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollY = currentScrollY;
        ticking = false;
    }

    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }, { passive: true });

    // 移动端面包屑导航横向滚动
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb) {
        let isScrolling = false;
        let startX;
        let scrollLeft;

        breadcrumb.addEventListener('touchstart', function(e) {
            isScrolling = true;
            startX = e.touches[0].pageX - breadcrumb.offsetLeft;
            scrollLeft = breadcrumb.scrollLeft;
        });

        breadcrumb.addEventListener('touchmove', function(e) {
            if (!isScrolling) return;
            e.preventDefault();
            const x = e.touches[0].pageX - breadcrumb.offsetLeft;
            const walk = (x - startX) * 2;
            breadcrumb.scrollLeft = scrollLeft - walk;
        });

        breadcrumb.addEventListener('touchend', function() {
            isScrolling = false;
        });
    }

    // 快速导航按钮
    const quickNav = document.createElement('button');
    quickNav.className = 'quick-nav';
    quickNav.innerHTML = '☰';
    quickNav.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: white;
        color: #667eea;
        border: 2px solid #667eea;
        font-size: 1.2rem;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    document.body.appendChild(quickNav);
    
    quickNav.addEventListener('click', function() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });
}

// 工具函数
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

// PWA 支持
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('ServiceWorker registration failed:', err);
    });
}

// 设备方向变化处理
window.addEventListener('orientationchange', function() {
    // 重新计算布局
    setTimeout(() => {
        window.scrollTo(0, window.scrollY);
    }, 100);
}); 