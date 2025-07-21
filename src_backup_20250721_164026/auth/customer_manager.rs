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
use crate::auth::{KefuAuthManager, KefuOnlineStatus};

/// 客户连接信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerConnection {
    pub customer_id: String,
    pub customer_name: String,
    pub connection_id: String,
    pub session_id: String,
    pub assigned_kefu_id: Option<String>,
    pub connect_time: DateTime<Utc>,
    pub last_heartbeat: DateTime<Utc>,
    pub client_ip: Option<String>,
    pub user_agent: Option<String>,
    pub status: CustomerStatus,
}

/// 客户状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CustomerStatus {
    Waiting,    // 等待分配客服
    Connected,  // 已连接客服
    Disconnected, // 已断开连接
}

/// 客户连接请求
#[derive(Debug, Deserialize, Clone)]
pub struct CustomerConnectRequest {
    pub customer_id: String,
    pub customer_name: String,
    pub client_ip: Option<String>,
    pub user_agent: Option<String>,
    pub preferred_kefu_id: Option<String>, // 指定客服ID（可选）
}

/// 客户连接响应
#[derive(Debug, Serialize)]
pub struct CustomerConnectResponse {
    pub success: bool,
    pub message: String,
    pub session_id: Option<String>,
    pub assigned_kefu_id: Option<String>,
    pub kefu_info: Option<KefuOnlineStatus>,
    pub error_code: Option<String>,
}

/// 客户断开请求
#[derive(Debug, Deserialize, Clone)]
pub struct CustomerDisconnectRequest {
    pub customer_id: String,
    pub session_id: String,
}

/// 客户心跳请求
#[derive(Debug, Deserialize, Clone)]
pub struct CustomerHeartbeatRequest {
    pub customer_id: String,
    pub session_id: String,
}

/// 客户连接管理器
pub struct CustomerManager {
    redis_pool: Arc<RedisPoolManager>,
    kefu_auth_manager: Arc<KefuAuthManager>,
    // 内存中的客户连接信息
    customer_connections: Arc<RwLock<HashMap<String, CustomerConnection>>>,
}

impl CustomerManager {
    /// 创建新的客户连接管理器
    pub fn new(redis_pool: Arc<RedisPoolManager>, kefu_auth_manager: Arc<KefuAuthManager>) -> Self {
        Self {
            redis_pool,
            kefu_auth_manager,
            customer_connections: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 客户连接
    pub async fn customer_connect(&self, request: CustomerConnectRequest) -> Result<CustomerConnectResponse> {
        info!("🔗 客户连接请求: {} ({})", request.customer_name, request.customer_id);

        // 检查客户是否已经连接
        if self.is_customer_connected(&request.customer_id).await? {
            return Ok(CustomerConnectResponse {
                success: false,
                message: "客户已连接，请勿重复连接".to_string(),
                session_id: None,
                assigned_kefu_id: None,
                kefu_info: None,
                error_code: Some("ALREADY_CONNECTED".to_string()),
            });
        }

        // 生成会话ID和连接ID
        let session_id = Uuid::new_v4().to_string();
        let connection_id = Uuid::new_v4().to_string();

        // 分配客服
        let assigned_kefu_id = if let Some(preferred_kefu_id) = &request.preferred_kefu_id {
            // 检查指定客服是否在线
            if self.kefu_auth_manager.is_kefu_online(preferred_kefu_id).await? {
                Some(preferred_kefu_id.clone())
            } else {
                warn!("⚠️ 指定的客服不在线: {}", preferred_kefu_id);
                None
            }
        } else {
            // 自动分配客服
            self.find_available_kefu().await?
        };

        // 创建客户连接信息
        let customer_connection = CustomerConnection {
            customer_id: request.customer_id.clone(),
            customer_name: request.customer_name.clone(),
            connection_id: connection_id.clone(),
            session_id: session_id.clone(),
            assigned_kefu_id: assigned_kefu_id.clone(),
            connect_time: Utc::now(),
            last_heartbeat: Utc::now(),
            client_ip: request.client_ip,
            user_agent: request.user_agent,
            status: if assigned_kefu_id.is_some() {
                CustomerStatus::Connected
            } else {
                CustomerStatus::Waiting
            },
        };

        // 保存到Redis
        let mut conn = self.redis_pool.get_connection().await?;
        
        // 保存客户连接信息
        let customer_key = format!("customer:connection:{}", request.customer_id);
        let connection_json = serde_json::to_string(&customer_connection)?;
        conn.set_ex::<_, _, ()>(&customer_key, connection_json, 3600).await?;

        // 保存会话映射
        let session_key = format!("customer:session:{}", session_id);
        conn.set_ex::<_, _, ()>(&session_key, &request.customer_id, 3600).await?;

        // 添加到客户列表
        let customer_list_key = "customer:connected:list";
        conn.sadd::<_, _, ()>(&customer_list_key, &request.customer_id).await?;

        // 如果分配了客服，建立客户-客服关系
        if let Some(kefu_id) = &assigned_kefu_id {
            let customer_kefu_key = format!("customer:kefu:{}", request.customer_id);
            conn.set_ex::<_, _, ()>(&customer_kefu_key, kefu_id, 3600).await?;

            // 更新客服的客户数量
            self.increment_kefu_customers(kefu_id, 1).await?;
        }

        // 更新内存中的连接信息
        {
            let mut connections = self.customer_connections.write().await;
            connections.insert(request.customer_id.clone(), customer_connection.clone());
        }

        // 获取客服信息
        let kefu_info = if let Some(kefu_id) = &assigned_kefu_id {
            self.get_kefu_online_status(kefu_id).await?
        } else {
            None
        };

        let message = if assigned_kefu_id.is_some() {
            "连接成功，已分配客服".to_string()
        } else {
            "连接成功，正在等待客服分配".to_string()
        };

        info!("✅ 客户连接成功: {} -> 客服: {:?}", request.customer_id, assigned_kefu_id);

        Ok(CustomerConnectResponse {
            success: true,
            message,
            session_id: Some(session_id),
            assigned_kefu_id,
            kefu_info,
            error_code: None,
        })
    }

    /// 客户断开连接
    pub async fn customer_disconnect(&self, request: CustomerDisconnectRequest) -> Result<CustomerConnectResponse> {
        info!("🔌 客户断开连接: {} (session: {})", request.customer_id, request.session_id);

        // 验证会话
        if !self.validate_customer_session(&request.session_id, &request.customer_id).await? {
            return Ok(CustomerConnectResponse {
                success: false,
                message: "无效的会话".to_string(),
                session_id: None,
                assigned_kefu_id: None,
                kefu_info: None,
                error_code: Some("INVALID_SESSION".to_string()),
            });
        }

        // 执行断开连接
        self.perform_customer_disconnect(&request.customer_id, &request.session_id).await?;

        Ok(CustomerConnectResponse {
            success: true,
            message: "断开连接成功".to_string(),
            session_id: None,
            assigned_kefu_id: None,
            kefu_info: None,
            error_code: None,
        })
    }

    /// 客户心跳
    pub async fn customer_heartbeat(&self, request: CustomerHeartbeatRequest) -> Result<CustomerConnectResponse> {
        // 验证会话
        if !self.validate_customer_session(&request.session_id, &request.customer_id).await? {
            return Ok(CustomerConnectResponse {
                success: false,
                message: "无效的会话".to_string(),
                session_id: None,
                assigned_kefu_id: None,
                kefu_info: None,
                error_code: Some("INVALID_SESSION".to_string()),
            });
        }

        // 更新心跳
        self.update_customer_heartbeat(&request.customer_id).await?;

        Ok(CustomerConnectResponse {
            success: true,
            message: "心跳更新成功".to_string(),
            session_id: Some(request.session_id),
            assigned_kefu_id: None,
            kefu_info: None,
            error_code: None,
        })
    }

    /// 检查客户是否已连接
    pub async fn is_customer_connected(&self, customer_id: &str) -> Result<bool> {
        let mut conn = self.redis_pool.get_connection().await?;
        let key = format!("customer:connection:{}", customer_id);
        let exists: bool = conn.exists(&key).await?;
        Ok(exists)
    }

    /// 验证客户会话有效性
    async fn validate_customer_session(&self, session_id: &str, customer_id: &str) -> Result<bool> {
        let mut conn = self.redis_pool.get_connection().await?;
        let session_key = format!("customer:session:{}", session_id);
        
        let stored_customer_id: Option<String> = conn.get(&session_key).await?;
        Ok(stored_customer_id.as_ref() == Some(&customer_id.to_string()))
    }

    /// 执行客户断开连接
    async fn perform_customer_disconnect(&self, customer_id: &str, session_id: &str) -> Result<()> {
        let mut conn = self.redis_pool.get_connection().await?;
        
        // 获取客户连接信息
        let customer_key = format!("customer:connection:{}", customer_id);
        let connection_json: Option<String> = conn.get(&customer_key).await?;
        
        if let Some(json) = connection_json {
            if let Ok(connection) = serde_json::from_str::<CustomerConnection>(&json) {
                // 如果有分配的客服，释放客服
                if let Some(kefu_id) = &connection.assigned_kefu_id {
                    self.increment_kefu_customers(kefu_id, -1).await?;
                    
                    // 删除客户-客服关系
                    let customer_kefu_key = format!("customer:kefu:{}", customer_id);
                    conn.del::<_, ()>(&customer_kefu_key).await?;
                }
            }
        }
        
        // 删除客户连接信息
        conn.del::<_, ()>(&customer_key).await?;
        
        // 删除会话映射
        let session_key = format!("customer:session:{}", session_id);
        conn.del::<_, ()>(&session_key).await?;
        
        // 从客户列表移除
        let customer_list_key = "customer:connected:list";
        conn.srem::<_, _, ()>(&customer_list_key, customer_id).await?;
        
        // 从内存连接信息移除
        {
            let mut connections = self.customer_connections.write().await;
            connections.remove(customer_id);
        }
        
        info!("✅ 客户断开连接完成: {}", customer_id);
        Ok(())
    }

    /// 更新客户心跳
    async fn update_customer_heartbeat(&self, customer_id: &str) -> Result<()> {
        if !self.is_customer_connected(customer_id).await? {
            return Ok(());
        }
        
        let mut conn = self.redis_pool.get_connection().await?;
        let key = format!("customer:connection:{}", customer_id);
        
        // 获取当前连接信息
        let connection_json: Option<String> = conn.get(&key).await?;
        if let Some(json) = connection_json {
            if let Ok(mut connection) = serde_json::from_str::<CustomerConnection>(&json) {
                connection.last_heartbeat = Utc::now();
                let updated_json = serde_json::to_string(&connection)?;
                conn.set_ex::<_, _, ()>(&key, updated_json, 3600).await?;
                
                // 更新内存中的连接信息
                {
                    let mut connections = self.customer_connections.write().await;
                    connections.insert(customer_id.to_string(), connection);
                }
            }
        }
        
        Ok(())
    }

    /// 查找可用的客服
    async fn find_available_kefu(&self) -> Result<Option<String>> {
        let online_kefu = self.kefu_auth_manager.get_online_kefu_list().await?;
        
        // 找到客户数最少的客服
        let mut best_kefu: Option<&KefuOnlineStatus> = None;
        
        for kefu in &online_kefu {
            if kefu.current_customers < kefu.max_customers && 
               (best_kefu.is_none() || kefu.current_customers < best_kefu.unwrap().current_customers) {
                best_kefu = Some(kefu);
            }
        }
        
        if let Some(kefu) = best_kefu {
            info!("🎯 为客户分配客服: {} ({})", kefu.kefu_id, kefu.real_name);
            return Ok(Some(kefu.kefu_id.clone()));
        }
        
        warn!("⚠️ 没有可用的客服");
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
                conn.set_ex::<_, _, ()>(&key, updated_json, 3600).await?;
            }
        }
        
        Ok(())
    }

    /// 获取客服在线状态
    async fn get_kefu_online_status(&self, kefu_id: &str) -> Result<Option<KefuOnlineStatus>> {
        let mut conn = self.redis_pool.get_connection().await?;
        let key = format!("kefu:online:{}", kefu_id);
        
        let status_json: Option<String> = conn.get(&key).await?;
        if let Some(json) = status_json {
            if let Ok(status) = serde_json::from_str::<KefuOnlineStatus>(&json) {
                return Ok(Some(status));
            }
        }
        
        Ok(None)
    }

    /// 获取连接的客户列表
    pub async fn get_connected_customers(&self) -> Result<Vec<CustomerConnection>> {
        let mut conn = self.redis_pool.get_connection().await?;
        let customer_list_key = "customer:connected:list";
        
        let customer_ids: Vec<String> = conn.smembers(customer_list_key).await?;
        let mut connected_customers = Vec::new();
        
        for customer_id in customer_ids {
            let key = format!("customer:connection:{}", customer_id);
            if let Ok(Some(connection_json)) = conn.get::<_, Option<String>>(&key).await {
                if let Ok(connection) = serde_json::from_str::<CustomerConnection>(&connection_json) {
                    connected_customers.push(connection);
                }
            }
        }
        
        Ok(connected_customers)
    }

    /// 获取客服的客户列表
    pub async fn get_kefu_customers(&self, kefu_id: &str) -> Result<Vec<CustomerConnection>> {
        let mut conn = self.redis_pool.get_connection().await?;
        let mut customers = Vec::new();
        
        // 获取所有客户连接
        let customer_list_key = "customer:connected:list";
        let customer_ids: Vec<String> = conn.smembers(customer_list_key).await?;
        
        for customer_id in customer_ids {
            let customer_kefu_key = format!("customer:kefu:{}", customer_id);
            if let Ok(Some(assigned_kefu)) = conn.get::<_, Option<String>>(&customer_kefu_key).await {
                if assigned_kefu == kefu_id {
                    let connection_key = format!("customer:connection:{}", customer_id);
                    if let Ok(Some(connection_json)) = conn.get::<_, Option<String>>(&connection_key).await {
                        if let Ok(connection) = serde_json::from_str::<CustomerConnection>(&connection_json) {
                            customers.push(connection);
                        }
                    }
                }
            }
        }
        
        Ok(customers)
    }

    /// 清理过期的客户连接
    pub async fn cleanup_expired_customers(&self) -> Result<()> {
        let mut conn = self.redis_pool.get_connection().await?;
        let customer_list_key = "customer:connected:list";
        
        let customer_ids: Vec<String> = conn.smembers(customer_list_key).await?;
        let now = Utc::now();
        
        for customer_id in customer_ids {
            let key = format!("customer:connection:{}", customer_id);
            
            if let Ok(Some(connection_json)) = conn.get::<_, Option<String>>(&key).await {
                if let Ok(connection) = serde_json::from_str::<CustomerConnection>(&connection_json) {
                    // 如果超过10分钟没有心跳，认为已断线
                    if now.signed_duration_since(connection.last_heartbeat).num_minutes() > 10 {
                        warn!("⚠️ 清理过期客户连接: {}", customer_id);
                        self.perform_customer_disconnect(&customer_id, &connection.session_id).await?;
                    }
                }
            }
        }
        
        Ok(())
    }

    /// 获取连接的客户数量
    pub async fn get_connected_customer_count(&self) -> Result<usize> {
        let mut conn = self.redis_pool.get_connection().await?;
        let customer_list_key = "customer:connected:list";
        let count: usize = conn.scard(customer_list_key).await?;
        Ok(count)
    }

    /// 检查客户会话是否有效
    #[allow(dead_code)]
    pub async fn is_customer_session_valid(&self, session_id: &str) -> Result<bool> {
        let mut conn = self.redis_pool.get_connection().await?;
        let session_key = format!("customer:session:{}", session_id);
        let exists: bool = conn.exists(&session_key).await?;
        Ok(exists)
    }

    /// 根据会话ID获取客户ID
    #[allow(dead_code)]
    pub async fn get_customer_id_by_session(&self, session_id: &str) -> Result<Option<String>> {
        let mut conn = self.redis_pool.get_connection().await?;
        let session_key = format!("customer:session:{}", session_id);
        let customer_id: Option<String> = conn.get(&session_key).await?;
        Ok(customer_id)
    }
}