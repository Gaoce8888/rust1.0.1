// 企业级客服系统 - Service Worker
const CACHE_NAME = 'customer-service-docs-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/assets/css/style.css',
    '/assets/css/mobile.css',
    '/assets/js/main.js',
    '/assets/js/mobile.js',
    '/pages/api.html',
    '/pages/architecture.html',
    '/pages/deployment.html',
    '/pages/development.html',
    '/pages/modules.html',
    '/pages/troubleshooting.html',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js'
];

// 安装 Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('缓存已打开');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('缓存失败:', error);
            })
    );
});

// 激活 Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
    // 跳过非 GET 请求
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 如果找到缓存，返回缓存
                if (response) {
                    return response;
                }

                // 否则，发起网络请求
                return fetch(event.request).then(response => {
                    // 检查是否是有效的响应
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // 克隆响应，因为响应流只能使用一次
                    const responseToCache = response.clone();

                    // 将新的响应添加到缓存
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            // 只缓存同源资源和CDN资源
                            const url = event.request.url;
                            if (url.startsWith(self.location.origin) || 
                                url.includes('cdnjs.cloudflare.com')) {
                                cache.put(event.request, responseToCache);
                            }
                        });

                    return response;
                });
            })
            .catch(error => {
                // 网络请求失败时的处理
                console.error('Fetch failed:', error);
                
                // 返回离线页面（如果有的话）
                return caches.match('/offline.html');
            })
    );
});

// 后台同步
self.addEventListener('sync', event => {
    if (event.tag === 'sync-docs') {
        event.waitUntil(syncDocuments());
    }
});

// 推送通知
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : '有新的文档更新',
        icon: '/assets/images/icon-192.png',
        badge: '/assets/images/badge-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('文档更新', options)
    );
});

// 通知点击处理
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});

// 同步文档函数
async function syncDocuments() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                const response = await fetch(request);
                await cache.put(request, response);
            } catch (error) {
                console.error('同步失败:', request.url, error);
            }
        }
    } catch (error) {
        console.error('文档同步失败:', error);
    }
} 