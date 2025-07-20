use std::collections::HashMap;
use std::sync::Arc;
use anyhow::Result;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use tracing::{info, warn};

use crate::redis_pool::RedisPoolManager;

/// 客服认证信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KefuAuth {
    pub kefu_id: String,
    pub username: String,
    pub password_hash: String,
    pub real_name: String,
    pub department: String,
    pub is_active: bool,
    pub max_customers: u32,
}

/// 客服在线状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KefuOnlineStatus {
    pub kefu_id: String,
    pub username: String,
    pub real_name: String,
    pub is_online: bool,
    pub login_time: chrono::DateTime<chrono::Utc>,
    pub last_heartbeat: chrono::DateTime<chrono::Utc>,
    pub current_customers: u32,
    pub max_customers: u32,
    pub session_id: String,
}

/// 客服认证管理器
pub struct KefuAuthManager {
    redis_pool: Arc<RedisPoolManager>,
    // 内存缓存的客服账号信息
    kefu_accounts: Arc<RwLock<HashMap<String, KefuAuth>>>,
}

impl KefuAuthManager {
    /// 创建新的客服认证管理器
    pub fn new(redis_pool: Arc<RedisPoolManager>) -> Self {
        Self {
            redis_pool,
            kefu_accounts: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 初始化默认客服账号
    pub async fn initialize_default_accounts(&self) -> Result<()> {
        info!("🔐 初始化默认客服账号");
        
        let mut accounts = self.kefu_accounts.write().await;
        
        // 添加默认客服账号
        let default_kefu = KefuAuth {
            kefu_id: "kf001".to_string(),
            username: "kefu001".to_string(),
            password_hash: self.hash_password("123456")?, // 默认密码
            real_name: "客服小王".to_string(),
            department: "技术支持部".to_string(),
            is_active: true,
            max_customers: 5,
        };
        
        accounts.insert("kf001".to_string(), default_kefu.clone());
        accounts.insert("kefu001".to_string(), default_kefu);
        
        // 添加第二个客服账号
        let kefu2 = KefuAuth {
            kefu_id: "kf002".to_string(),
            username: "kefu002".to_string(),
            password_hash: self.hash_password("123456")?,
            real_name: "客服小李".to_string(),
            department: "售后服务部".to_string(),
            is_active: true,
            max_customers: 8,
        };
        
        accounts.insert("kf002".to_string(), kefu2.clone());
        accounts.insert("kefu002".to_string(), kefu2);
        
        info!("✅ 默认客服账号初始化完成");
        Ok(())
    }

    /// 验证客服登录
    pub async fn authenticate_kefu(&self, username: &str, password: &str) -> Result<Option<KefuAuth>> {
        info!("🔐 验证客服登录: {}", username);
        
        let accounts = self.kefu_accounts.read().await;
        if let Some(kefu) = accounts.get(username) {
            if !kefu.is_active {
                warn!("⚠️ 客服账号已被禁用: {}", username);
                return Ok(None);
            }
            
            if self.verify_password(password, &kefu.password_hash)? {
                info!("✅ 客服登录验证成功: {}", username);
                return Ok(Some(kefu.clone()));
            }
        }
        
        warn!("❌ 客服登录验证失败: {}", username);
        Ok(None)
    }

    /// 检查客服是否已在线
    pub async fn is_kefu_online(&self, kefu_id: &str) -> Result<bool> {
        let mut conn = self.redis_pool.get_connection().await?;
        let key = format!("kefu:online:{}", kefu_id);
        let exists: bool = conn.exists(&key).await?;
        Ok(exists)
    }

    /// 客服上线
    pub async fn kefu_login(&self, kefu_auth: &KefuAuth, session_id: &str) -> Result<bool> {
        info!("🟢 客服上线: {} ({})", kefu_auth.real_name, kefu_auth.kefu_id);
        
        // 检查是否已经在线
        if self.is_kefu_online(&kefu_auth.kefu_id).await? {
            warn!("⚠️ 客服已在线，拒绝重复登录: {}", kefu_auth.kefu_id);
            return Ok(false);
        }
        
        let mut conn = self.redis_pool.get_connection().await?;
        
        // 创建在线状态
        let online_status = KefuOnlineStatus {
            kefu_id: kefu_auth.kefu_id.clone(),
            username: kefu_auth.username.clone(),
            real_name: kefu_auth.real_name.clone(),
            is_online: true,
            login_time: chrono::Utc::now(),
            last_heartbeat: chrono::Utc::now(),
            current_customers: 0,
            max_customers: kefu_auth.max_customers,
            session_id: session_id.to_string(),
        };
        
        // 保存到Redis
        let key = format!("kefu:online:{}", kefu_auth.kefu_id);
        let status_json = serde_json::to_string(&online_status)?;
        conn.set_ex::<_, _, ()>(&key, status_json, 3600).await?; // 1小时过期
        
        // 添加到在线列表
        let online_list_key = "kefu:online:list";
        conn.sadd::<_, _, ()>(&online_list_key, &kefu_auth.kefu_id).await?;
        
        info!("✅ 客服上线成功: {}", kefu_auth.kefu_id);
        Ok(true)
    }

    /// 客服下线
    pub async fn kefu_logout(&self, kefu_id: &str) -> Result<()> {
        info!("🔴 客服下线: {}", kefu_id);
        
        let mut conn = self.redis_pool.get_connection().await?;
        
        // 删除在线状态
        let key = format!("kefu:online:{}", kefu_id);
        conn.del::<_, ()>(&key).await?;
        
        // 从在线列表移除
        let online_list_key = "kefu:online:list";
        conn.srem::<_, _, ()>(&online_list_key, kefu_id).await?;
        
        info!("✅ 客服下线完成: {}", kefu_id);
        Ok(())
    }

    /// 更新客服心跳
    pub async fn update_kefu_heartbeat(&self, kefu_id: &str) -> Result<()> {
        if !self.is_kefu_online(kefu_id).await? {
            return Ok(());
        }
        
        let mut conn = self.redis_pool.get_connection().await?;
        let key = format!("kefu:online:{}", kefu_id);
        
        // 获取当前状态
        let status_json: Option<String> = conn.get(&key).await?;
        if let Some(json) = status_json {
            if let Ok(mut status) = serde_json::from_str::<KefuOnlineStatus>(&json) {
                status.last_heartbeat = chrono::Utc::now();
                let updated_json = serde_json::to_string(&status)?;
                conn.set_ex::<_, _, ()>(&key, updated_json, 3600).await?;
            }
        }
        
        Ok(())
    }

    /// 获取在线客服列表
    pub async fn get_online_kefu_list(&self) -> Result<Vec<KefuOnlineStatus>> {
        let mut conn = self.redis_pool.get_connection().await?;
        let online_list_key = "kefu:online:list";
        
        let kefu_ids: Vec<String> = conn.smembers(&online_list_key).await?;
        let mut online_kefu = Vec::new();
        
        for kefu_id in kefu_ids {
            let key = format!("kefu:online:{}", kefu_id);
            if let Ok(Some(status_json)) = conn.get::<_, Option<String>>(&key).await {
                if let Ok(status) = serde_json::from_str::<KefuOnlineStatus>(&status_json) {
                    online_kefu.push(status);
                }
            }
        }
        
        Ok(online_kefu)
    }

    /// 为客户分配客服
    pub async fn assign_kefu_for_customer(&self, customer_id: &str) -> Result<Option<String>> {
        let online_kefu = self.get_online_kefu_list().await?;
        
        // 找到客户数最少的客服
        let mut best_kefu: Option<&KefuOnlineStatus> = None;
        
        for kefu in &online_kefu {
            if kefu.current_customers < kefu.max_customers {
                if best_kefu.is_none() || kefu.current_customers < best_kefu.unwrap().current_customers {
                    best_kefu = Some(kefu);
                }
            }
        }
        
        if let Some(kefu) = best_kefu {
            info!("🎯 为客户 {} 分配客服: {} ({})", customer_id, kefu.kefu_id, kefu.real_name);
            
            // 更新客服的客户数
            self.increment_kefu_customers(&kefu.kefu_id, 1).await?;
            
            // 记录客户-客服关系
            let mut conn = self.redis_pool.get_connection().await?;
            let customer_key = format!("customer:kefu:{}", customer_id);
            conn.set_ex(&customer_key, &kefu.kefu_id, 3600).await?;
            
            return Ok(Some(kefu.kefu_id.clone()));
        }
        
        warn!("⚠️ 没有可用的客服为客户分配: {}", customer_id);
        Ok(None)
    }

    /// 更新客服的客户数量
    async fn increment_kefu_customers(&self, kefu_id: &str, increment: i32) -> Result<()> {
        let mut conn = self.redis_pool.get_connection().await?;
        let key = format!("kefu:online:{}", kefu_id);
        
        if let Ok(Some(status_json)) = conn.get::<_, Option<String>>(&key).await {
            if let Ok(mut status) = serde_json::from_str::<KefuOnlineStatus>(&status_json) {
                if increment > 0 {
                    status.current_customers += increment as u32;
                } else {
                    status.current_customers = status.current_customers.saturating_sub((-increment) as u32);
                }
                
                let updated_json = serde_json::to_string(&status)?;
                conn.set_ex(&key, updated_json, 3600).await?;
            }
        }
        
        Ok(())
    }

    /// 客户断开连接时释放客服
    pub async fn release_kefu_for_customer(&self, customer_id: &str) -> Result<()> {
        let mut conn = self.redis_pool.get_connection().await?;
        let customer_key = format!("customer:kefu:{}", customer_id);
        
        if let Ok(Some(kefu_id)) = conn.get::<_, Option<String>>(&customer_key).await {
            self.increment_kefu_customers(&kefu_id, -1).await?;
            conn.del(&customer_key).await?;
            info!("✅ 为客户 {} 释放客服: {}", customer_id, kefu_id);
        }
        
        Ok(())
    }

    /// 获取客户对应的客服
    pub async fn get_kefu_for_customer(&self, customer_id: &str) -> Result<Option<String>> {
        let mut conn = self.redis_pool.get_connection().await?;
        let customer_key = format!("customer:kefu:{}", customer_id);
        let kefu_id: Option<String> = conn.get(&customer_key).await?;
        Ok(kefu_id)
    }

    /// 密码哈希
    fn hash_password(&self, password: &str) -> Result<String> {
        // 简单的哈希，生产环境应该使用更强的哈希算法
        let hash = format!("{:x}", md5::compute(password));
        Ok(hash)
    }

    /// 验证密码
    fn verify_password(&self, password: &str, hash: &str) -> Result<bool> {
        let computed_hash = self.hash_password(password)?;
        Ok(computed_hash == hash)
    }

    /// 清理过期的客服连接
    pub async fn cleanup_expired_kefu(&self) -> Result<()> {
        let mut conn = self.redis_pool.get_connection().await?;
        let online_list_key = "kefu:online:list";
        
        let kefu_ids: Vec<String> = conn.smembers(&online_list_key).await?;
        let now = chrono::Utc::now();
        
        for kefu_id in kefu_ids {
            let key = format!("kefu:online:{}", kefu_id);
            
            if let Ok(Some(status_json)) = conn.get::<_, Option<String>>(&key).await {
                if let Ok(status) = serde_json::from_str::<KefuOnlineStatus>(&status_json) {
                    // 如果超过5分钟没有心跳，认为已断线
                    if now.signed_duration_since(status.last_heartbeat).num_minutes() > 5 {
                        warn!("⚠️ 清理过期客服连接: {}", kefu_id);
                        self.kefu_logout(&kefu_id).await?;
                    }
                }
            }
        }
        
        Ok(())
    }
}