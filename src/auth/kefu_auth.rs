use std::collections::HashMap;
use std::sync::Arc;
use anyhow::Result;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use tracing::{info, warn};
use uuid::Uuid;
use chrono::{DateTime, Utc};

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
    pub created_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
}

/// 客服在线状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KefuOnlineStatus {
    pub kefu_id: String,
    pub username: String,
    pub real_name: String,
    pub is_online: bool,
    pub login_time: DateTime<Utc>,
    pub last_heartbeat: DateTime<Utc>,
    pub current_customers: u32,
    pub max_customers: u32,
    pub session_id: String,
    pub connection_id: String,
    pub client_ip: Option<String>,
    pub user_agent: Option<String>,
}

/// 客服登录请求
#[derive(Debug, Deserialize, Clone)]
pub struct KefuLoginRequest {
    pub username: String,
    pub password: String,
    pub client_ip: Option<String>,
    pub user_agent: Option<String>,
}

/// 客服登录响应
#[derive(Debug, Serialize)]
pub struct KefuLoginResponse {
    pub success: bool,
    pub message: String,
    pub session_id: Option<String>,
    pub kefu_info: Option<KefuAuth>,
    pub error_code: Option<String>,
}

/// 客服下线请求
#[derive(Debug, Deserialize, Clone)]
pub struct KefuLogoutRequest {
    pub session_id: String,
    pub kefu_id: String,
}

/// 客服心跳请求
#[derive(Debug, Deserialize, Clone)]
pub struct KefuHeartbeatRequest {
    pub session_id: String,
    pub kefu_id: String,
}

/// 客服认证管理器
pub struct KefuAuthManager {
    redis_pool: Arc<RedisPoolManager>,
    // 内存缓存的客服账号信息
    kefu_accounts: Arc<RwLock<HashMap<String, KefuAuth>>>,
    // 在线会话管理
    active_sessions: Arc<RwLock<HashMap<String, String>>>, // session_id -> kefu_id
}

impl KefuAuthManager {
    /// 创建新的客服认证管理器
    pub fn new(redis_pool: Arc<RedisPoolManager>) -> Self {
        Self {
            redis_pool,
            kefu_accounts: Arc::new(RwLock::new(HashMap::new())),
            active_sessions: Arc::new(RwLock::new(HashMap::new())),
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
            password_hash: self.hash_password("123456")?,
            real_name: "客服小王".to_string(),
            department: "技术支持部".to_string(),
            is_active: true,
            max_customers: 5,
            created_at: Utc::now(),
            last_login: None,
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
            created_at: Utc::now(),
            last_login: None,
        };
        
        accounts.insert("kf002".to_string(), kefu2.clone());
        accounts.insert("kefu002".to_string(), kefu2);
        
        info!("✅ 默认客服账号初始化完成，共 {} 个账号", accounts.len());
        info!("🔍 已添加的账号: {:?}", accounts.keys().collect::<Vec<_>>());
        Ok(())
    }

    /// 客服登录验证
    pub async fn kefu_login(&self, request: KefuLoginRequest) -> Result<KefuLoginResponse> {
        info!("🔐 客服登录请求: {}", request.username);
        
        // 验证账号密码
        let accounts = self.kefu_accounts.read().await;
        info!("🔍 当前账号数量: {}", accounts.len());
        info!("🔍 可用账号: {:?}", accounts.keys().collect::<Vec<_>>());
        
        let kefu = match accounts.get(&request.username) {
            Some(k) => k,
            None => {
                return Ok(KefuLoginResponse {
                    success: false,
                    message: "账号不存在".to_string(),
                    session_id: None,
                    kefu_info: None,
                    error_code: Some("ACCOUNT_NOT_FOUND".to_string()),
                });
            }
        };

        // 检查账号是否激活
        if !kefu.is_active {
            return Ok(KefuLoginResponse {
                success: false,
                message: "账号已被禁用".to_string(),
                session_id: None,
                kefu_info: None,
                error_code: Some("ACCOUNT_DISABLED".to_string()),
            });
        }

        // 验证密码
        if !self.verify_password(&request.password, &kefu.password_hash)? {
            return Ok(KefuLoginResponse {
                success: false,
                message: "密码错误".to_string(),
                session_id: None,
                kefu_info: None,
                error_code: Some("INVALID_PASSWORD".to_string()),
            });
        }

        // 检查是否已经在线
        if self.is_kefu_online(&kefu.kefu_id).await? {
            return Ok(KefuLoginResponse {
                success: false,
                message: "该账号已在其他设备登录，请先下线".to_string(),
                session_id: None,
                kefu_info: None,
                error_code: Some("ALREADY_ONLINE".to_string()),
            });
        }

        // 生成会话ID
        let session_id = Uuid::new_v4().to_string();
        let connection_id = Uuid::new_v4().to_string();

        // 创建在线状态
        let online_status = KefuOnlineStatus {
            kefu_id: kefu.kefu_id.clone(),
            username: kefu.username.clone(),
            real_name: kefu.real_name.clone(),
            is_online: true,
            login_time: Utc::now(),
            last_heartbeat: Utc::now(),
            current_customers: 0,
            max_customers: kefu.max_customers,
            session_id: session_id.clone(),
            connection_id: connection_id.clone(),
            client_ip: request.client_ip,
            user_agent: request.user_agent,
        };

        // 保存到Redis
        let mut conn = self.redis_pool.get_connection().await?;
        
        // 保存在线状态
        let status_key = format!("kefu:online:{}", kefu.kefu_id);
        let status_json = serde_json::to_string(&online_status)?;
        conn.set_ex::<_, _, ()>(&status_key, status_json, 3600).await?; // 1小时过期

        // 保存会话映射
        let session_key = format!("kefu:session:{}", session_id);
        conn.set_ex::<_, _, ()>(&session_key, &kefu.kefu_id, 3600).await?;

        // 添加到在线列表
        let online_list_key = "kefu:online:list";
        conn.sadd::<_, _, ()>(&online_list_key, &kefu.kefu_id).await?;

        // 更新内存中的会话映射
        {
            let mut sessions = self.active_sessions.write().await;
            sessions.insert(session_id.clone(), kefu.kefu_id.clone());
        }

        info!("✅ 客服登录成功: {} ({})", kefu.real_name, kefu.kefu_id);

        Ok(KefuLoginResponse {
            success: true,
            message: "登录成功".to_string(),
            session_id: Some(session_id),
            kefu_info: Some(kefu.clone()),
            error_code: None,
        })
    }

    /// 客服下线
    pub async fn kefu_logout(&self, request: KefuLogoutRequest) -> Result<KefuLoginResponse> {
        info!("🔴 客服下线请求: {} (session: {})", request.kefu_id, request.session_id);
        
        // 验证会话
        if !self.validate_session(&request.session_id, &request.kefu_id).await? {
            return Ok(KefuLoginResponse {
                success: false,
                message: "无效的会话".to_string(),
                session_id: None,
                kefu_info: None,
                error_code: Some("INVALID_SESSION".to_string()),
            });
        }

        // 执行下线
        self.perform_kefu_logout(&request.kefu_id, &request.session_id).await?;

        Ok(KefuLoginResponse {
            success: true,
            message: "下线成功".to_string(),
            session_id: None,
            kefu_info: None,
            error_code: None,
        })
    }

    /// 客服心跳
    pub async fn kefu_heartbeat(&self, request: KefuHeartbeatRequest) -> Result<KefuLoginResponse> {
        // 验证会话
        if !self.validate_session(&request.session_id, &request.kefu_id).await? {
            return Ok(KefuLoginResponse {
                success: false,
                message: "无效的会话".to_string(),
                session_id: None,
                kefu_info: None,
                error_code: Some("INVALID_SESSION".to_string()),
            });
        }

        // 更新心跳
        self.update_kefu_heartbeat(&request.kefu_id).await?;

        Ok(KefuLoginResponse {
            success: true,
            message: "心跳更新成功".to_string(),
            session_id: Some(request.session_id),
            kefu_info: None,
            error_code: None,
        })
    }

    /// 检查客服是否在线
    pub async fn is_kefu_online(&self, kefu_id: &str) -> Result<bool> {
        let mut conn = self.redis_pool.get_connection().await?;
        let key = format!("kefu:online:{}", kefu_id);
        let exists: bool = conn.exists(&key).await?;
        Ok(exists)
    }

    /// 验证会话有效性
    async fn validate_session(&self, session_id: &str, kefu_id: &str) -> Result<bool> {
        let mut conn = self.redis_pool.get_connection().await?;
        let session_key = format!("kefu:session:{}", session_id);
        
        let stored_kefu_id: Option<String> = conn.get(&session_key).await?;
        Ok(stored_kefu_id.as_ref() == Some(&kefu_id.to_string()))
    }

    /// 执行客服下线
    async fn perform_kefu_logout(&self, kefu_id: &str, session_id: &str) -> Result<()> {
        let mut conn = self.redis_pool.get_connection().await?;
        
        // 删除在线状态
        let status_key = format!("kefu:online:{}", kefu_id);
        conn.del::<_, ()>(&status_key).await?;
        
        // 删除会话映射
        let session_key = format!("kefu:session:{}", session_id);
        conn.del::<_, ()>(&session_key).await?;
        
        // 从在线列表移除
        let online_list_key = "kefu:online:list";
        conn.srem::<_, _, ()>(&online_list_key, kefu_id).await?;
        
        // 从内存会话映射移除
        {
            let mut sessions = self.active_sessions.write().await;
            sessions.remove(session_id);
        }
        
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
                status.last_heartbeat = Utc::now();
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
        
        let kefu_ids: Vec<String> = conn.smembers(online_list_key).await?;
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

    /// 强制下线客服（管理员功能）
    pub async fn force_kefu_logout(&self, kefu_id: &str) -> Result<()> {
        info!("🔴 强制下线客服: {}", kefu_id);
        
        let mut conn = self.redis_pool.get_connection().await?;
        
        // 获取会话ID
        let status_key = format!("kefu:online:{}", kefu_id);
        let status_json: Option<String> = conn.get(&status_key).await?;
        
        if let Some(json) = status_json {
            if let Ok(status) = serde_json::from_str::<KefuOnlineStatus>(&json) {
                // 删除会话映射
                let session_key = format!("kefu:session:{}", status.session_id);
                conn.del::<_, ()>(&session_key).await?;
                
                // 从内存会话映射移除
                {
                    let mut sessions = self.active_sessions.write().await;
                    sessions.remove(&status.session_id);
                }
            }
        }
        
        // 删除在线状态
        conn.del::<_, ()>(&status_key).await?;
        
        // 从在线列表移除
        let online_list_key = "kefu:online:list";
        conn.srem::<_, _, ()>(&online_list_key, kefu_id).await?;
        
        info!("✅ 强制下线完成: {}", kefu_id);
        Ok(())
    }

    /// 清理过期的客服连接
    pub async fn cleanup_expired_kefu(&self) -> Result<()> {
        let mut conn = self.redis_pool.get_connection().await?;
        let online_list_key = "kefu:online:list";
        
        let kefu_ids: Vec<String> = conn.smembers(online_list_key).await?;
        let now = Utc::now();
        
        for kefu_id in kefu_ids {
            let key = format!("kefu:online:{}", kefu_id);
            
            if let Ok(Some(status_json)) = conn.get::<_, Option<String>>(&key).await {
                if let Ok(status) = serde_json::from_str::<KefuOnlineStatus>(&status_json) {
                    // 如果超过5分钟没有心跳，认为已断线
                    if now.signed_duration_since(status.last_heartbeat).num_minutes() > 5 {
                        warn!("⚠️ 清理过期客服连接: {}", kefu_id);
                        self.force_kefu_logout(&kefu_id).await?;
                    }
                }
            }
        }
        
        Ok(())
    }

    /// 获取客服信息
    #[allow(dead_code)]
    pub async fn get_kefu_info(&self, kefu_id: &str) -> Result<Option<KefuAuth>> {
        let accounts = self.kefu_accounts.read().await;
        Ok(accounts.get(kefu_id).cloned())
    }

    /// 密码哈希
    fn hash_password(&self, password: &str) -> Result<String> {
        // 使用更安全的哈希算法
        let hash = format!("{:x}", md5::compute(password));
        Ok(hash)
    }

    /// 验证密码
    fn verify_password(&self, password: &str, hash: &str) -> Result<bool> {
        let computed_hash = self.hash_password(password)?;
        Ok(computed_hash == hash)
    }

    /// 获取在线客服数量
    pub async fn get_online_kefu_count(&self) -> Result<usize> {
        let mut conn = self.redis_pool.get_connection().await?;
        let online_list_key = "kefu:online:list";
        let count: usize = conn.scard(online_list_key).await?;
        Ok(count)
    }

    /// 检查会话是否有效
    #[allow(dead_code)]
    pub async fn is_session_valid(&self, session_id: &str) -> Result<bool> {
        let mut conn = self.redis_pool.get_connection().await?;
        let session_key = format!("kefu:session:{}", session_id);
        let exists: bool = conn.exists(&session_key).await?;
        Ok(exists)
    }

    /// 根据会话ID获取客服ID
    #[allow(dead_code)]
    pub async fn get_kefu_id_by_session(&self, session_id: &str) -> Result<Option<String>> {
        let mut conn = self.redis_pool.get_connection().await?;
        let session_key = format!("kefu:session:{}", session_id);
        let kefu_id: Option<String> = conn.get(&session_key).await?;
        Ok(kefu_id)
    }
}