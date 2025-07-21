use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

/// 缓存项
#[derive(Clone, Debug)]
struct CacheItem<T> {
    value: T,
    expires_at: Option<Instant>,
}

impl<T> CacheItem<T> {
    fn new(value: T, ttl: Option<Duration>) -> Self {
        let expires_at = ttl.map(|duration| Instant::now() + duration);
        Self { value, expires_at }
    }
    
    fn is_expired(&self) -> bool {
        self.expires_at
            .map(|expires_at| Instant::now() > expires_at)
            .unwrap_or(false)
    }
}

/// 内存缓存
pub struct MemoryCache<T: Clone> {
    cache: Arc<RwLock<HashMap<String, CacheItem<T>>>>,
    max_size: usize,
}

impl<T: Clone + Send + Sync> MemoryCache<T> {
    pub fn new(max_size: usize) -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            max_size,
        }
    }
    
    /// 获取缓存值
    pub async fn get(&self, key: &str) -> Option<T> {
        let cache = self.cache.read().await;
        
        if let Some(item) = cache.get(key) {
            if !item.is_expired() {
                return Some(item.value.clone());
            }
        }
        
        None
    }
    
    /// 设置缓存值
    pub async fn set(&self, key: String, value: T, ttl: Option<Duration>) {
        let mut cache = self.cache.write().await;
        
        // 如果缓存已满，移除最早的项
        if cache.len() >= self.max_size && !cache.contains_key(&key) {
            // 简单的FIFO策略
            if let Some(first_key) = cache.keys().next().cloned() {
                cache.remove(&first_key);
            }
        }
        
        cache.insert(key, CacheItem::new(value, ttl));
    }
    
    /// 删除缓存值
    pub async fn delete(&self, key: &str) -> bool {
        let mut cache = self.cache.write().await;
        cache.remove(key).is_some()
    }
    
    /// 清空缓存
    pub async fn clear(&self) {
        let mut cache = self.cache.write().await;
        cache.clear();
    }
    
    /// 清理过期项
    pub async fn evict_expired(&self) {
        let mut cache = self.cache.write().await;
        cache.retain(|_, item| !item.is_expired());
    }
    
    /// 获取缓存大小
    pub async fn size(&self) -> usize {
        let cache = self.cache.read().await;
        cache.len()
    }
}

/// 用于序列化的缓存值包装
#[derive(Serialize, Deserialize, Clone)]
pub struct CachedValue<T> {
    pub value: T,
    pub cached_at: i64,
    pub ttl_seconds: Option<i64>,
}

impl<T> CachedValue<T> {
    pub fn new(value: T, ttl: Option<Duration>) -> Self {
        Self {
            value,
            cached_at: chrono::Utc::now().timestamp(),
            ttl_seconds: ttl.map(|d| d.as_secs() as i64),
        }
    }
    
    pub fn is_expired(&self) -> bool {
        if let Some(ttl) = self.ttl_seconds {
            let now = chrono::Utc::now().timestamp();
            now > self.cached_at + ttl
        } else {
            false
        }
    }
}