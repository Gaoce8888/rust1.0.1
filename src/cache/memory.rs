use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use serde::{Serialize, de::DeserializeOwned};

#[derive(Debug, Clone)]
struct CacheEntry<T> {
    data: T,
    expires_at: Option<Instant>,
}

/// Enterprise-grade in-memory cache
#[derive(Debug)]
pub struct MemoryCache<T> {
    data: Arc<RwLock<HashMap<String, CacheEntry<T>>>>,
}

impl<T> MemoryCache<T>
where
    T: Clone + Send + Sync + 'static,
{
    pub fn new() -> Self {
        Self {
            data: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn get(&self, key: &str) -> Option<T> {
        let mut data = self.data.write().await;
        
        if let Some(entry) = data.get(key) {
            // Check if expired
            if let Some(expires_at) = entry.expires_at {
                if Instant::now() > expires_at {
                    data.remove(key);
                    return None;
                }
            }
            Some(entry.data.clone())
        } else {
            None
        }
    }

    pub async fn set(&self, key: String, value: T) {
        self.set_with_ttl(key, value, None).await;
    }

    pub async fn set_with_ttl(&self, key: String, value: T, ttl: Option<Duration>) {
        let expires_at = ttl.map(|ttl| Instant::now() + ttl);
        let entry = CacheEntry {
            data: value,
            expires_at,
        };
        
        let mut data = self.data.write().await;
        data.insert(key, entry);
    }

    pub async fn remove(&self, key: &str) -> bool {
        let mut data = self.data.write().await;
        data.remove(key).is_some()
    }

    pub async fn clear(&self) {
        let mut data = self.data.write().await;
        data.clear();
    }
}

impl<T> Default for MemoryCache<T>
where
    T: Clone + Send + Sync + 'static,
{
    fn default() -> Self {
        Self::new()
    }
}

impl<T> Clone for MemoryCache<T> {
    fn clone(&self) -> Self {
        Self {
            data: Arc::clone(&self.data),
        }
    }
}