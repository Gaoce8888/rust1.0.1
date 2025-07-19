use std::sync::Arc;
use std::time::Duration;
use anyhow::Result;
use serde::{Serialize, Deserialize, de::DeserializeOwned};
use crate::cache::memory::{MemoryCache, CachedValue};
use crate::redis_client::RedisManager;
use tracing::{info, warn};

/// 缓存配置
#[derive(Clone, Debug)]
pub struct CacheConfig {
    /// 内存缓存最大条目数
    pub memory_max_size: usize,
    /// 默认TTL（秒）
    pub default_ttl: u64,
    /// 是否启用Redis缓存
    pub enable_redis: bool,
    /// Redis键前缀
    pub redis_prefix: String,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            memory_max_size: 10000,
            default_ttl: 3600, // 1小时
            enable_redis: true,
            redis_prefix: "cache:".to_string(),
        }
    }
}

/// 多级缓存管理器
pub struct CacheManager {
    /// L1: 内存缓存
    memory_cache: MemoryCache<String>,
    /// L2: Redis缓存
    redis: Option<Arc<RwLock<RedisManager>>>,
    /// 缓存配置
    config: CacheConfig,
}

use tokio::sync::RwLock;

impl CacheManager {
    pub fn new(config: CacheConfig, redis: Option<Arc<RwLock<RedisManager>>>) -> Self {
        Self {
            memory_cache: MemoryCache::new(config.memory_max_size),
            redis,
            config,
        }
    }
    
    /// 获取缓存值
    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>> {
        // L1: 尝试从内存缓存获取
        if let Some(cached_json) = self.memory_cache.get(key).await {
            match serde_json::from_str::<CachedValue<T>>(&cached_json) {
                Ok(cached) if !cached.is_expired() => {
                    info!("Cache hit (memory): {}", key);
                    return Ok(Some(cached.value));
                }
                _ => {
                    // 缓存数据无效或过期，删除
                    self.memory_cache.delete(key).await;
                }
            }
        }
        
        // L2: 尝试从Redis获取
        if self.config.enable_redis {
            if let Some(redis) = &self.redis {
                let redis_key = format!("{}{}", self.config.redis_prefix, key);
                let redis = redis.read().await;
                
                match redis.get_cache::<String>(&redis_key).await {
                    Ok(Some(cached_json)) => {
                        match serde_json::from_str::<CachedValue<T>>(&cached_json) {
                            Ok(cached) if !cached.is_expired() => {
                                info!("Cache hit (redis): {}", key);
                                
                                // 写回内存缓存
                                self.memory_cache.set(
                                    key.to_string(),
                                    cached_json,
                                    Some(Duration::from_secs(300)) // 内存中保存5分钟
                                ).await;
                                
                                return Ok(Some(cached.value));
                            }
                            _ => {
                                // Redis中的数据无效或过期，删除
                                let _ = redis.delete_cache(&redis_key).await;
                            }
                        }
                    }
                    Ok(None) => {}
                    Err(e) => {
                        warn!("Redis cache error: {}", e);
                    }
                }
            }
        }
        
        Ok(None)
    }
    
    /// 设置缓存值
    pub async fn set<T: Serialize>(&self, key: String, value: T, ttl: Option<Duration>) -> Result<()> {
        let ttl = ttl.unwrap_or_else(|| Duration::from_secs(self.config.default_ttl));
        let cached = CachedValue::new(value, Some(ttl));
        let cached_json = serde_json::to_string(&cached)?;
        
        // L1: 写入内存缓存
        self.memory_cache.set(key.clone(), cached_json.clone(), Some(ttl)).await;
        
        // L2: 写入Redis
        if self.config.enable_redis {
            if let Some(redis) = &self.redis {
                let redis_key = format!("{}{}", self.config.redis_prefix, key);
                let redis = redis.write().await;
                
                if let Err(e) = redis.set_cache(&redis_key, &cached_json, ttl.as_secs() as i64).await {
                    warn!("Failed to set Redis cache: {}", e);
                }
            }
        }
        
        Ok(())
    }
    
    /// 删除缓存值
    pub async fn delete(&self, key: &str) -> Result<()> {
        // 从内存缓存删除
        self.memory_cache.delete(key).await;
        
        // 从Redis删除
        if self.config.enable_redis {
            if let Some(redis) = &self.redis {
                let redis_key = format!("{}{}", self.config.redis_prefix, key);
                let redis = redis.write().await;
                
                if let Err(e) = redis.delete_cache(&redis_key).await {
                    warn!("Failed to delete Redis cache: {}", e);
                }
            }
        }
        
        Ok(())
    }
    
    /// 清空所有缓存
    pub async fn clear(&self) -> Result<()> {
        // 清空内存缓存
        self.memory_cache.clear().await;
        
        // 清空Redis缓存（谨慎使用）
        if self.config.enable_redis {
            if let Some(redis) = &self.redis {
                let pattern = format!("{}*", self.config.redis_prefix);
                let redis = redis.write().await;
                
                if let Err(e) = redis.delete_pattern(&pattern).await {
                    warn!("Failed to clear Redis cache: {}", e);
                }
            }
        }
        
        Ok(())
    }
    
    /// 启动定期清理任务
    pub fn start_eviction_task(self: Arc<Self>) {
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(300)); // 每5分钟
            
            loop {
                interval.tick().await;
                self.memory_cache.evict_expired().await;
                
                let size = self.memory_cache.size().await;
                info!("Cache eviction completed, current size: {}", size);
            }
        });
    }
}