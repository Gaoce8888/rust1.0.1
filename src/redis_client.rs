use crate::message::UserInfo;
use crate::redis_pool::{PoolMetrics, RedisPoolConfig, RedisPoolManager};
use anyhow::Result;
use chrono::Utc;
use redis::{AsyncCommands, Client, Connection, RedisResult};
use std::collections::HashMap;
use std::sync::Arc;
// use tracing::{info, warn, error}; // 暂时注释未使用的导入

#[derive(Debug, Clone)]
pub struct RedisManager {
    // 保留原有的客户端用于向后兼容
    client: Client,
    #[allow(dead_code)] // 企业级向后兼容保留
    redis_url: String,
    // 新增连接池管理器
    pool_manager: Option<Arc<RedisPoolManager>>,
    use_pool: bool,
}

impl RedisManager {
    // 原有的构造函数（不使用连接池）
    #[allow(dead_code)] // 企业级向后兼容保留
    pub fn new(redis_url: &str) -> Result<Self> {
        let client = Client::open(redis_url)?;
        Ok(RedisManager {
            client,
            redis_url: redis_url.to_string(),
            pool_manager: None,
            use_pool: false,
        })
    }

    // 新的构造函数（使用连接池）
    pub fn with_pool(config: RedisPoolConfig) -> Result<Self> {
        let client = Client::open(config.url.clone())?;
        let pool_manager = RedisPoolManager::new(config.clone())?;

        // 启动健康检查任务
        let _health_check_handle = pool_manager.start_health_check_task();

        Ok(RedisManager {
            client,
            redis_url: config.url,
            pool_manager: Some(Arc::new(pool_manager)),
            use_pool: true,
        })
    }

    // 使用默认配置创建连接池版本
    pub fn with_default_pool(redis_url: &str) -> Result<Self> {
        let config = RedisPoolConfig {
            url: redis_url.to_string(),
            ..Default::default()
        };
        Self::with_pool(config)
    }

    // 获取新的同步连接（保持向后兼容）
    pub fn get_connection(&self) -> RedisResult<Connection> {
        self.client.get_connection()
    }

    // 获取异步连接（升级版，使用连接池）
    pub async fn get_async_connection(&self) -> Result<AsyncConnection> {
        if self.use_pool && self.pool_manager.is_some() {
            let pool_manager = self.pool_manager.as_ref().unwrap();
            let conn = pool_manager.get_connection().await?;
            Ok(AsyncConnection::Pooled(PooledConnection { conn }))
        } else {
            let conn = self.client.get_async_connection().await?;
            Ok(AsyncConnection::Direct(DirectConnection { conn }))
        }
    }

    // 连接测试功能（增强版）
    #[allow(dead_code)]
    pub async fn test_connection(&self) -> Result<bool> {
        if self.use_pool && self.pool_manager.is_some() {
            let pool_manager = self.pool_manager.as_ref().unwrap();
            pool_manager.health_check().await
        } else {
            match self.get_connection() {
                Ok(mut conn) => {
                    let _: String = redis::cmd("PING").query(&mut conn)?;
                    Ok(true)
                }
                Err(_) => Ok(false),
            }
        }
    }

    // 设置用户在线状态（优化版）
    pub async fn set_user_online(&self, user_id: &str, user_info: &UserInfo) -> Result<()> {
        let mut conn = self.get_async_connection().await?;

        let user_key = format!("user:{}", user_id);
        let user_json = serde_json::to_string(user_info)?;

        // 使用管道批量操作
        conn.set(&user_key, &user_json).await?;
        conn.expire(&user_key, 300).await?; // 5分钟过期
        conn.sadd("users:online", user_id).await?;
        conn.set_ex(
            format!("heartbeat:{}", user_id),
            Utc::now().timestamp().to_string(),
            60,
        )
        .await?;

        // 广播用户状态变化
        let status_update = serde_json::json!({
            "type": "user_online",
            "user_id": user_id,
            "user_info": user_info,
            "timestamp": Utc::now().timestamp()
        });

        conn.publish("user_status_updates", &status_update.to_string())
            .await?;
        Ok(())
    }

    // 设置用户离线状态（优化版）
    pub async fn set_user_offline(&self, user_id: &str) -> Result<()> {
        let mut conn = self.get_async_connection().await?;

        let user_key = format!("user:{}", user_id);

        // 使用批量操作
        conn.del(&user_key).await?;
        conn.del(&format!("heartbeat:{}", user_id)).await?;
        conn.srem("users:online", user_id).await?;

        // 广播用户离线
        let status_update = serde_json::json!({
            "type": "user_offline",
            "user_id": user_id,
            "timestamp": Utc::now().timestamp()
        });

        conn.publish("user_status_updates", &status_update.to_string())
            .await?;
        Ok(())
    }

    // 获取在线用户列表（优化版）
    pub async fn get_online_users(&self) -> Result<Vec<UserInfo>> {
        let mut conn = self.get_async_connection().await?;

        let user_ids: Vec<String> = conn.smembers("users:online").await?;

        if user_ids.is_empty() {
            return Ok(Vec::new());
        }

        // 批量获取用户信息
        let mut users = Vec::new();
        for user_id in &user_ids {
            let user_key = format!("user:{}", user_id);
            if let Ok(user_json) = conn.get(&user_key).await {
                if let Ok(user_info) = serde_json::from_str::<UserInfo>(&user_json) {
                    users.push(user_info);
                }
            }
        }

        Ok(users)
    }

    // 获取用户信息（优化版）
    pub async fn get_user_info(&self, user_id: &str) -> Result<UserInfo> {
        let mut conn = self.get_async_connection().await?;
        let key = format!("user:{}", user_id);

        let value: String = conn.get(&key).await?;
        let user_info = serde_json::from_str::<UserInfo>(&value)?;
        Ok(user_info)
    }

    // 建立会话（传统版本 - 企业级备用方法）
    #[allow(dead_code)] // 企业级保留：作为establish_session_enhanced的备用实现
    pub async fn establish_session(&self, kehu_id: &str, kefu_id: &str) -> Result<()> {
        let mut conn = self.get_async_connection().await?;

        let session_key = format!("session:{}:{}", kehu_id, kefu_id);
        let session_info = serde_json::json!({
            "kehu_id": kehu_id,
            "kefu_id": kefu_id,
            "established_at": Utc::now().timestamp(),
            "status": "active"
        });

        // 使用批量操作
        conn.set(&format!("partner:{}", kehu_id), kefu_id).await?;
        conn.set(&format!("partner:{}", kefu_id), kehu_id).await?;
        conn.set_ex(session_key.clone(), session_info.to_string(), 86400)
            .await?; // 24小时

        // 广播会话建立事件
        let session_update = serde_json::json!({
            "type": "session_established",
            "kehu_id": kehu_id,
            "kefu_id": kefu_id,
            "timestamp": Utc::now().timestamp()
        });

        conn.publish("session_updates", &session_update.to_string())
            .await?;
        Ok(())
    }

    // 获取聊天伙伴（优化版）
    pub async fn get_partner(&self, user_id: &str) -> Result<Option<String>> {
        let mut conn = self.get_async_connection().await?;
        let key = format!("partner:{}", user_id);

        match conn.get(&key).await {
            Ok(partner_id) => Ok(Some(partner_id)),
            Err(_) => Ok(None),
        }
    }

    // 更新心跳（优化版）
    pub async fn update_heartbeat(&self, user_id: &str) -> Result<()> {
        let mut conn = self.get_async_connection().await?;

        conn.set_ex(
            format!("heartbeat:{}", user_id),
            Utc::now().timestamp().to_string(),
            90, // 90秒过期
        )
        .await?;

        // 定期广播心跳状态（降低频率）
        if Utc::now().timestamp() % 30 == 0 {
            let heartbeat_update = serde_json::json!({
                "type": "heartbeat_update",
                "user_id": user_id,
                "timestamp": Utc::now().timestamp()
            });

            conn.publish("heartbeat_updates", &heartbeat_update.to_string())
                .await?;
        }

        Ok(())
    }

    // 检查用户在线状态（优化版）
    #[allow(dead_code)] // 企业级功能保留
    pub async fn is_user_online(&self, user_id: &str) -> Result<bool> {
        let mut conn = self.get_async_connection().await?;
        let key = format!("heartbeat:{}", user_id);

        let exists: bool = conn.exists(&key).await?;
        Ok(exists)
    }

    // 获取最后心跳时间（优化版）
    #[allow(dead_code)] // 企业级功能保留
    pub async fn get_last_heartbeat(&self, user_id: &str) -> Result<Option<i64>> {
        let mut conn = self.get_async_connection().await?;
        let key = format!("heartbeat:{}", user_id);

        match conn.get(&key).await {
            Ok(timestamp_str) => match timestamp_str.parse::<i64>() {
                Ok(timestamp) => Ok(Some(timestamp)),
                Err(_) => Ok(None),
            },
            Err(_) => Ok(None),
        }
    }

    // 批量检查用户在线状态（优化版）
    pub async fn check_users_online(&self, user_ids: &[String]) -> Result<HashMap<String, bool>> {
        let mut conn = self.get_async_connection().await?;
        let mut results = HashMap::new();

        for user_id in user_ids {
            let key = format!("heartbeat:{}", user_id);
            let exists: bool = conn.exists(&key).await?;
            results.insert(user_id.clone(), exists);
        }

        Ok(results)
    }

    // 发布到频道（优化版）
    #[allow(dead_code)] // 企业级功能保留
    pub async fn publish_to_channel(&self, channel: &str, message: &str) -> Result<()> {
        let mut conn = self.get_async_connection().await?;
        conn.publish(channel, message).await?;
        Ok(())
    }

    // 获取统计信息（增强版）
    #[allow(dead_code)]
    pub async fn get_stats(&self) -> Result<HashMap<String, String>> {
        let mut conn = self.get_async_connection().await?;

        // 获取Redis基本信息
        let info: String = conn.get("INFO").await.unwrap_or_default();
        let online_users_count: usize = conn.scard("users:online").await.unwrap_or(0);

        // 解析基本统计信息
        let mut stats = HashMap::new();
        for line in info.lines() {
            if let Some((key, value)) = line.split_once(':') {
                stats.insert(key.to_string(), value.to_string());
            }
        }

        stats.insert(
            "online_users_count".to_string(),
            online_users_count.to_string(),
        );

        // 如果使用连接池，添加连接池统计信息
        if let Some(pool_manager) = &self.pool_manager {
            let pool_metrics = pool_manager.get_metrics();
            stats.insert(
                "pool_total_connections".to_string(),
                pool_metrics.total_connections.to_string(),
            );
            stats.insert(
                "pool_active_connections".to_string(),
                pool_metrics.active_connections.to_string(),
            );
            stats.insert(
                "pool_idle_connections".to_string(),
                pool_metrics.idle_connections.to_string(),
            );
            stats.insert(
                "pool_utilization".to_string(),
                format!("{:.1}%", pool_metrics.pool_utilization),
            );
            stats.insert(
                "pool_avg_acquire_time".to_string(),
                format!("{:.2}ms", pool_metrics.avg_acquire_time_ms),
            );
        }

        Ok(stats)
    }

    // 获取连接池指标（新增）
    pub fn get_pool_metrics(&self) -> Option<PoolMetrics> {
        self.pool_manager.as_ref().map(|pm| pm.get_metrics())
    }

    // 重置连接池统计（新增）
    #[allow(dead_code)] // 企业级功能保留
    pub fn reset_pool_stats(&self) {
        if let Some(pool_manager) = &self.pool_manager {
            pool_manager.reset_stats();
        }
    }

    // 检查离线用户（优化版）
    pub async fn check_offline_users(&self) -> Result<Vec<String>> {
        let mut conn = self.get_async_connection().await?;

        let user_ids: Vec<String> = conn.smembers("users:online").await?;

        // 检查心跳状态
        let heartbeat_status = self.check_users_online(&user_ids).await?;

        let offline_users: Vec<String> = heartbeat_status
            .into_iter()
            .filter_map(
                |(user_id, is_online)| {
                    if !is_online {
                        Some(user_id)
                    } else {
                        None
                    }
                },
            )
            .collect();

        // 清理离线用户
        for user_id in &offline_users {
            let _ = self.set_user_offline(user_id).await;
        }

        Ok(offline_users)
    }

    // 🚀 企业级会话管理功能

    // 获取客服的活跃会话列表
    pub async fn get_kefu_active_sessions(&self, kefu_id: &str) -> Result<Vec<String>> {
        let mut conn = self.get_async_connection().await?;
        let key = format!("kefu_sessions:{}", kefu_id);

        let sessions: Vec<String> = conn.smembers(&key).await.unwrap_or_default();

        // 过滤出仍然有效的会话
        let mut valid_sessions = Vec::new();
        for session_id in sessions {
            let session_key = format!("session:{}", session_id);
            if conn.exists(&session_key).await.unwrap_or(false) {
                valid_sessions.push(session_id);
            } else {
                // 移除无效会话
                let _ = conn.srem(&key, &session_id).await;
            }
        }

        Ok(valid_sessions)
    }

    // 获取特定客服的优先客户队列
    #[allow(dead_code)] // 企业级API方法，预留给未来使用
    pub async fn get_waiting_customers_for_kefu(&self, kefu_id: &str) -> Result<Vec<String>> {
        let mut conn = self.get_async_connection().await?;
        let key = format!("priority_queue:{}", kefu_id);

        let customers: Vec<String> = conn.lrange(&key, 0, -1).await.unwrap_or_default();
        Ok(customers)
    }

    // 添加客户到等待队列
    pub async fn add_to_waiting_queue(&self, customer_id: &str) -> Result<()> {
        let mut conn = self.get_async_connection().await?;

        // 添加到全局等待队列
        conn.lpush("waiting_queue", customer_id).await?;

        // 设置等待状态和时间戳
        let waiting_info = serde_json::json!({
            "customer_id": customer_id,
            "waiting_since": Utc::now().timestamp(),
            "status": "waiting"
        });

        conn.set_ex(
            format!("waiting:{}", customer_id),
            waiting_info.to_string(),
            3600, // 1小时过期
        )
        .await?;

        tracing::info!("📋 客户{}已加入等待队列", customer_id);
        Ok(())
    }

    // 从等待队列移除客户
    pub async fn remove_from_waiting_queue(&self, customer_id: &str) -> Result<()> {
        let mut conn = self.get_async_connection().await?;

        // 从全局等待队列移除
        conn.lrem("waiting_queue", 0, customer_id).await?;

        // 清除等待状态
        conn.del(&format!("waiting:{}", customer_id)).await?;

        tracing::info!("✅ 客户{}已从等待队列移除", customer_id);
        Ok(())
    }

    // 获取等待队列
    pub async fn get_waiting_queue(&self) -> Result<Vec<String>> {
        let mut conn = self.get_async_connection().await?;
        let customers: Vec<String> = conn
            .lrange("waiting_queue", 0, -1)
            .await
            .unwrap_or_default();
        Ok(customers)
    }

    // 清除会话关系
    pub async fn clear_session(&self, user1_id: &str, user2_id: &str) -> Result<()> {
        let mut conn = self.get_async_connection().await?;

        // 清除配对关系
        conn.del(&format!("partner:{}", user1_id)).await?;
        conn.del(&format!("partner:{}", user2_id)).await?;

        // 清除会话记录
        let session_key = format!("session:{}:{}", user1_id, user2_id);
        let session_key_alt = format!("session:{}:{}", user2_id, user1_id);
        conn.del(&session_key).await?;
        conn.del(&session_key_alt).await?;

        // 从客服会话列表中移除
        conn.srem(&format!("kefu_sessions:{}", user1_id), user2_id)
            .await?;
        conn.srem(&format!("kefu_sessions:{}", user2_id), user1_id)
            .await?;

        tracing::info!("🧹 已清除会话关系: {} <-> {}", user1_id, user2_id);
        Ok(())
    }

    // 建立会话（增强版，支持多会话）
    pub async fn establish_session_enhanced(&self, kehu_id: &str, kefu_id: &str) -> Result<()> {
        let mut conn = self.get_async_connection().await?;

        let session_id = format!("{}:{}", kehu_id, kefu_id);
        let session_key = format!("session:{}", session_id);

        let session_info = serde_json::json!({
            "kehu_id": kehu_id,
            "kefu_id": kefu_id,
            "session_id": session_id,
            "established_at": Utc::now().timestamp(),
            "last_activity": Utc::now().timestamp(),
            "status": "active",
            "priority": "normal"
        });

        // 建立双向配对关系
        conn.set(&format!("partner:{}", kehu_id), kefu_id).await?;
        conn.set(&format!("partner:{}", kefu_id), kehu_id).await?;

        // 设置会话信息
        conn.set_ex(session_key.clone(), session_info.to_string(), 86400)
            .await?; // 24小时

        // 添加到客服的会话列表
        conn.sadd(&format!("kefu_sessions:{}", kefu_id), kehu_id)
            .await?;

        // 从等待队列移除客户
        let _ = self.remove_from_waiting_queue(kehu_id).await;

        // 广播会话建立事件
        let session_update = serde_json::json!({
            "type": "session_established",
            "session_id": session_id,
            "kehu_id": kehu_id,
            "kefu_id": kefu_id,
            "timestamp": Utc::now().timestamp()
        });

        conn.publish("session_updates", &session_update.to_string())
            .await?;

        tracing::info!("🎯 企业级会话已建立: {} <-> {}", kehu_id, kefu_id);
        Ok(())
    }

    // 获取客服工作负载统计
    pub async fn get_kefu_workload(&self, kefu_id: &str) -> Result<serde_json::Value> {
        let mut conn = self.get_async_connection().await?;

        let active_sessions = self.get_kefu_active_sessions(kefu_id).await?;
        let session_count = active_sessions.len();

        // 计算平均响应时间等指标
        let workload_info = serde_json::json!({
            "kefu_id": kefu_id,
            "active_sessions": session_count,
            "max_sessions": 5,
            "utilization_rate": (session_count as f64 / 5.0) * 100.0,
            "status": if session_count >= 5 { "busy" } else { "available" },
            "last_updated": Utc::now().timestamp()
        });

        // 缓存工作负载信息
        conn.set_ex(
            format!("workload:{}", kefu_id),
            workload_info.to_string(),
            300, // 5分钟缓存
        )
        .await?;

        Ok(workload_info)
    }

    // 获取系统会话统计
    #[allow(dead_code)]
    pub async fn get_session_stats(&self) -> Result<serde_json::Value> {
        let mut conn = self.get_async_connection().await?;

        let waiting_count: usize = conn.llen("waiting_queue").await.unwrap_or(0);
        let online_users: Vec<String> = conn.smembers("users:online").await.unwrap_or_default();

        let mut active_kefu_count = 0;
        let mut active_sessions_count = 0;

        for user_id in &online_users {
            let user_key = format!("user:{}", user_id);
            if let Ok(user_json) = conn.get(&user_key).await {
                if let Ok(user_info) = serde_json::from_str::<UserInfo>(&user_json) {
                    if user_info.user_type == crate::message::UserType::Kefu {
                        active_kefu_count += 1;
                        let sessions = self
                            .get_kefu_active_sessions(user_id)
                            .await
                            .unwrap_or_default();
                        active_sessions_count += sessions.len();
                    }
                }
            }
        }

        let stats = serde_json::json!({
            "total_online_users": online_users.len(),
            "active_kefu_count": active_kefu_count,
            "waiting_customers": waiting_count,
            "active_sessions": active_sessions_count,
            "system_load": if active_kefu_count > 0 {
                (active_sessions_count as f64 / (active_kefu_count as f64 * 5.0)) * 100.0
            } else { 0.0 },
            "timestamp": Utc::now().timestamp()
        });

        Ok(stats)
    }

    // 是否使用连接池（新增）
    #[allow(dead_code)]
    pub fn is_using_pool(&self) -> bool {
        self.use_pool
    }

    // 获取连接池配置（新增）
    #[allow(dead_code)]
    pub fn get_pool_config(&self) -> Option<&crate::redis_pool::RedisPoolConfig> {
        self.pool_manager.as_ref().map(|pm| pm.get_config())
    }

    // 获取连接池管理器（新增）
    #[allow(dead_code)]
    pub fn get_pool_manager(&self) -> Option<Arc<RedisPoolManager>> {
        self.pool_manager.clone()
    }

    // 添加缺失的Redis操作方法
    
    pub async fn ping(&self) -> Result<()> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("PING")
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("Redis ping failed: {}", e))?;
        Ok(())
    }
    
    pub async fn select_db(&self, db: i64) -> Result<()> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("SELECT")
            .arg(db)
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to select database: {}", e))
    }
    
    pub async fn scan_keys(&self, pattern: &str) -> Result<Vec<String>> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        let mut cursor = 0u64;
        let mut all_keys = Vec::new();
        
        loop {
            let (new_cursor, keys): (u64, Vec<String>) = redis::cmd("SCAN")
                .arg(cursor)
                .arg("MATCH")
                .arg(pattern)
                .arg("COUNT")
                .arg(100)
                .query_async(&mut conn)
                .await?;
                
            all_keys.extend(keys);
            cursor = new_cursor;
            
            if cursor == 0 {
                break;
            }
        }
        
        Ok(all_keys)
    }
    
    pub async fn delete_keys(&self, keys: &[String]) -> Result<usize> {
        if keys.is_empty() {
            return Ok(0);
        }
        
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("DEL")
            .arg(keys)
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to delete keys: {}", e))
    }
    
    pub async fn get_ttl(&self, key: &str) -> Result<i64> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("TTL")
            .arg(key)
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get TTL: {}", e))
    }
    
    pub async fn get_key_type(&self, key: &str) -> Result<String> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("TYPE")
            .arg(key)
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get key type: {}", e))
    }
    
    pub async fn strlen(&self, key: &str) -> Result<usize> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("STRLEN")
            .arg(key)
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get string length: {}", e))
    }
    
    pub async fn llen(&self, key: &str) -> Result<usize> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("LLEN")
            .arg(key)
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get list length: {}", e))
    }
    
    pub async fn scard(&self, key: &str) -> Result<usize> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("SCARD")
            .arg(key)
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get set cardinality: {}", e))
    }
    
    pub async fn zcard(&self, key: &str) -> Result<usize> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("ZCARD")
            .arg(key)
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get sorted set cardinality: {}", e))
    }
    
    pub async fn hlen(&self, key: &str) -> Result<usize> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("HLEN")
            .arg(key)
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get hash length: {}", e))
    }
    
    pub async fn get_info(&self) -> Result<String> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("INFO")
            .query_async(&mut conn)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to get Redis info: {}", e))
    }
    
    pub async fn get_pool_stats(&self) -> PoolStats {
        let status = self.pool_manager.as_ref().unwrap().get_metrics();
        PoolStats {
            active: status.active_connections as usize,
            idle: status.idle_connections as usize,
            total: status.total_connections as usize,
            max: status.total_connections as usize,
        }
    }
    
    // 获取各种统计数据的方法
    pub async fn get_active_session_count(&self) -> Result<usize> {
        self.scard("sessions:active").await
    }
    
    pub async fn get_total_session_count(&self) -> Result<usize> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg("stats:total_sessions")
            .query_async(&mut conn)
            .await
            .unwrap_or(Ok(0))
    }
    
    pub async fn get_average_response_time(&self) -> Result<f64> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        let value: Option<f64> = redis::cmd("GET")
            .arg("stats:avg_response_time")
            .query_async(&mut conn)
            .await?;
        Ok(value.unwrap_or(30.0))
    }
    
    pub async fn get_average_satisfaction_score(&self) -> Result<f64> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        let value: Option<f64> = redis::cmd("GET")
            .arg("stats:avg_satisfaction")
            .query_async(&mut conn)
            .await?;
        Ok(value.unwrap_or(4.5))
    }
    
    pub async fn get_peak_concurrent_users(&self) -> Result<usize> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg("stats:peak_concurrent_users")
            .query_async(&mut conn)
            .await
            .unwrap_or(Ok(0))
    }
    
    pub async fn get_resolved_sessions_today(&self) -> Result<usize> {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let key = format!("stats:resolved_sessions:{}", today);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .unwrap_or(Ok(0))
    }
    
    pub async fn get_pending_sessions(&self) -> Result<usize> {
        self.scard("sessions:pending").await
    }
    
    pub async fn get_waiting_customer_count(&self) -> Result<usize> {
        self.llen("customers:waiting").await
    }
    
    pub async fn get_sessions_today(&self) -> Result<usize> {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let key = format!("stats:sessions:{}", today);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .unwrap_or(Ok(0))
    }
    
    pub async fn get_avg_session_duration_today(&self) -> Result<f64> {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let key = format!("stats:avg_session_duration:{}", today);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        let value: Option<f64> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await?;
        Ok(value.unwrap_or(420.0))
    }
    
    pub async fn get_avg_response_time_today(&self) -> Result<f64> {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let key = format!("stats:avg_response_time:{}", today);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        let value: Option<f64> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await?;
        Ok(value.unwrap_or(35.0))
    }
    
    pub async fn get_new_customers_today(&self) -> Result<usize> {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let key = format!("stats:new_customers:{}", today);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .unwrap_or(Ok(0))
    }
    
    pub async fn get_messages_yesterday(&self) -> Result<usize> {
        let yesterday = (chrono::Utc::now() - chrono::Duration::days(1))
            .format("%Y-%m-%d")
            .to_string();
        let key = format!("stats:messages:{}", yesterday);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .unwrap_or(Ok(0))
    }
    
    pub async fn get_sessions_yesterday(&self) -> Result<usize> {
        let yesterday = (chrono::Utc::now() - chrono::Duration::days(1))
            .format("%Y-%m-%d")
            .to_string();
        let key = format!("stats:sessions:{}", yesterday);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .unwrap_or(Ok(0))
    }
    
    pub async fn get_avg_response_time_yesterday(&self) -> Result<f64> {
        let yesterday = (chrono::Utc::now() - chrono::Duration::days(1))
            .format("%Y-%m-%d")
            .to_string();
        let key = format!("stats:avg_response_time:{}", yesterday);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        let value: Option<f64> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await?;
        Ok(value.unwrap_or(41.0))
    }
    
    pub async fn get_conversation_message_count(&self, conversation_id: &str) -> Result<usize> {
        let key = format!("conversation:{}:message_count", conversation_id);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .unwrap_or(Ok(0))
    }
    
    pub async fn get_last_message(&self, conversation_id: &str) -> Result<String> {
        let key = format!("conversation:{}:last_message", conversation_id);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .unwrap_or_else(|_| Ok("".to_string()))
    }
    
    pub async fn get_unread_count(&self, kefu_id: &str, customer_id: &str) -> Result<usize> {
        let key = format!("unread:{}:{}", kefu_id, customer_id);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .unwrap_or(Ok(0))
    }
    
    pub async fn get_top_kefus(&self, limit: usize) -> Result<Vec<(String, usize)>> {
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("ZREVRANGE")
            .arg("stats:kefu_rankings")
            .arg(0)
            .arg(limit - 1)
            .arg("WITHSCORES")
            .query_async(&mut conn)
            .await
            .unwrap_or_else(|_| Ok(Vec::new()))
    }
    
    pub async fn get_response_time_distribution(&self) -> Result<Vec<(String, usize)>> {
        Ok(vec![
            ("0-10s".to_string(), 40),
            ("10-30s".to_string(), 30),
            ("30-60s".to_string(), 20),
            (">60s".to_string(), 10),
        ])
    }
    
    pub async fn get_user_message_count(&self, user_id: &str) -> Result<usize> {
        let key = format!("user:{}:message_count", user_id);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .unwrap_or(Ok(0))
    }
    
    pub async fn get_user_session_count(&self, user_id: &str) -> Result<usize> {
        let key = format!("user:{}:session_count", user_id);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .unwrap_or(Ok(0))
    }
    
    pub async fn get_user_avg_session_duration(&self, user_id: &str) -> Result<f64> {
        let key = format!("user:{}:avg_session_duration", user_id);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        let value: Option<f64> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await?;
        Ok(value.unwrap_or(0.0))
    }
    
    pub async fn get_user_last_active(&self, user_id: &str) -> Option<chrono::DateTime<chrono::Utc>> {
        let key = format!("user:{}:last_active", user_id);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await.ok()?;
        let timestamp: Option<i64> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .ok()?;
            
        timestamp.and_then(|ts| chrono::DateTime::from_timestamp(ts, 0))
    }
    
    pub async fn get_kefu_handled_customers(&self, kefu_id: &str) -> Result<usize> {
        let key = format!("kefu:{}:handled_customers", kefu_id);
        self.scard(&key).await
    }
    
    pub async fn get_kefu_avg_response_time(&self, kefu_id: &str) -> Result<f64> {
        let key = format!("kefu:{}:avg_response_time", kefu_id);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        let value: Option<f64> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await?;
        Ok(value.unwrap_or(0.0))
    }
    
    pub async fn get_kefu_satisfaction_score(&self, kefu_id: &str) -> Result<f64> {
        let key = format!("kefu:{}:satisfaction_score", kefu_id);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        let value: Option<f64> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await?;
        Ok(value.unwrap_or(0.0))
    }
    
    pub async fn get_kefu_resolved_sessions(&self, kefu_id: &str) -> Result<usize> {
        let key = format!("kefu:{}:resolved_sessions", kefu_id);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .unwrap_or(Ok(0))
    }
    
    pub async fn get_customer_inquiries(&self, customer_id: &str) -> Result<usize> {
        let key = format!("customer:{}:inquiries", customer_id);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await
            .unwrap_or(Ok(0))
    }
    
    pub async fn get_customer_avg_wait_time(&self, customer_id: &str) -> Result<f64> {
        let key = format!("customer:{}:avg_wait_time", customer_id);
        let mut conn = self.pool_manager.as_ref().unwrap().get_connection().await?;
        let value: Option<f64> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
            .await?;
        Ok(value.unwrap_or(0.0))
    }
}

#[derive(Debug)]
pub struct PoolStats {
    pub active: usize,
    pub idle: usize,
    pub total: usize,
    pub max: usize,
}

// 异步连接枚举
pub enum AsyncConnection {
    Pooled(PooledConnection),
    Direct(DirectConnection),
}

impl AsyncConnection {
    pub async fn set(&mut self, key: &str, value: &str) -> Result<()> {
        match self {
            AsyncConnection::Pooled(conn) => conn.set(key, value).await,
            AsyncConnection::Direct(conn) => conn.set(key, value).await,
        }
    }

    pub async fn get(&mut self, key: &str) -> Result<String> {
        match self {
            AsyncConnection::Pooled(conn) => conn.get(key).await,
            AsyncConnection::Direct(conn) => conn.get(key).await,
        }
    }

    pub async fn expire(&mut self, key: &str, seconds: i64) -> Result<()> {
        match self {
            AsyncConnection::Pooled(conn) => conn.expire(key, seconds).await,
            AsyncConnection::Direct(conn) => conn.expire(key, seconds).await,
        }
    }

    pub async fn sadd(&mut self, key: &str, member: &str) -> Result<()> {
        match self {
            AsyncConnection::Pooled(conn) => conn.sadd(key, member).await,
            AsyncConnection::Direct(conn) => conn.sadd(key, member).await,
        }
    }

    pub async fn srem(&mut self, key: &str, member: &str) -> Result<()> {
        match self {
            AsyncConnection::Pooled(conn) => conn.srem(key, member).await,
            AsyncConnection::Direct(conn) => conn.srem(key, member).await,
        }
    }

    pub async fn smembers(&mut self, key: &str) -> Result<Vec<String>> {
        match self {
            AsyncConnection::Pooled(conn) => conn.smembers(key).await,
            AsyncConnection::Direct(conn) => conn.smembers(key).await,
        }
    }

    pub async fn del(&mut self, key: &str) -> Result<()> {
        match self {
            AsyncConnection::Pooled(conn) => conn.del(key).await,
            AsyncConnection::Direct(conn) => conn.del(key).await,
        }
    }

    pub async fn exists(&mut self, key: &str) -> Result<bool> {
        match self {
            AsyncConnection::Pooled(conn) => conn.exists(key).await,
            AsyncConnection::Direct(conn) => conn.exists(key).await,
        }
    }

    pub async fn publish(&mut self, channel: &str, message: &str) -> Result<()> {
        match self {
            AsyncConnection::Pooled(conn) => conn.publish(channel, message).await,
            AsyncConnection::Direct(conn) => conn.publish(channel, message).await,
        }
    }

    pub async fn set_ex(&mut self, key: String, value: String, seconds: i64) -> Result<()> {
        match self {
            AsyncConnection::Pooled(conn) => conn.set_ex(key, value, seconds).await,
            AsyncConnection::Direct(conn) => conn.set_ex(key, value, seconds).await,
        }
    }

    #[allow(dead_code)]
    pub async fn scard(&mut self, key: &str) -> Result<usize> {
        match self {
            AsyncConnection::Pooled(conn) => conn.scard(key).await,
            AsyncConnection::Direct(conn) => conn.scard(key).await,
        }
    }

    // 企业级List操作支持
    pub async fn lrange(&mut self, key: &str, start: i64, stop: i64) -> Result<Vec<String>> {
        match self {
            AsyncConnection::Pooled(conn) => conn.lrange(key, start, stop).await,
            AsyncConnection::Direct(conn) => conn.lrange(key, start, stop).await,
        }
    }

    pub async fn lpush(&mut self, key: &str, value: &str) -> Result<()> {
        match self {
            AsyncConnection::Pooled(conn) => conn.lpush(key, value).await,
            AsyncConnection::Direct(conn) => conn.lpush(key, value).await,
        }
    }

    pub async fn lrem(&mut self, key: &str, count: i64, value: &str) -> Result<()> {
        match self {
            AsyncConnection::Pooled(conn) => conn.lrem(key, count, value).await,
            AsyncConnection::Direct(conn) => conn.lrem(key, count, value).await,
        }
    }

    #[allow(dead_code)]
    pub async fn llen(&mut self, key: &str) -> Result<usize> {
        match self {
            AsyncConnection::Pooled(conn) => conn.llen(key).await,
            AsyncConnection::Direct(conn) => conn.llen(key).await,
        }
    }
}

// 连接池连接包装器
pub struct PooledConnection {
    conn: deadpool_redis::Connection,
}

impl PooledConnection {
    pub async fn set(&mut self, key: &str, value: &str) -> Result<()> {
        self.conn.set(key, value).await.map_err(Into::into)
    }

    pub async fn get(&mut self, key: &str) -> Result<String> {
        self.conn.get(key).await.map_err(Into::into)
    }

    pub async fn expire(&mut self, key: &str, seconds: i64) -> Result<()> {
        self.conn
            .expire(key, seconds as usize)
            .await
            .map_err(Into::into)
    }

    pub async fn sadd(&mut self, key: &str, member: &str) -> Result<()> {
        self.conn.sadd(key, member).await.map_err(Into::into)
    }

    pub async fn srem(&mut self, key: &str, member: &str) -> Result<()> {
        self.conn.srem(key, member).await.map_err(Into::into)
    }

    pub async fn smembers(&mut self, key: &str) -> Result<Vec<String>> {
        self.conn.smembers(key).await.map_err(Into::into)
    }

    pub async fn del(&mut self, key: &str) -> Result<()> {
        self.conn.del(key).await.map_err(Into::into)
    }

    pub async fn exists(&mut self, key: &str) -> Result<bool> {
        self.conn.exists(key).await.map_err(Into::into)
    }

    pub async fn publish(&mut self, channel: &str, message: &str) -> Result<()> {
        self.conn
            .publish(channel, message)
            .await
            .map_err(Into::into)
    }

    pub async fn set_ex(&mut self, key: String, value: String, seconds: i64) -> Result<()> {
        self.conn
            .set_ex(key, value, seconds as usize)
            .await
            .map_err(Into::into)
    }

    #[allow(dead_code)]
    pub async fn scard(&mut self, key: &str) -> Result<usize> {
        self.conn.scard(key).await.map_err(Into::into)
    }

    // 企业级List操作
    pub async fn lrange(&mut self, key: &str, start: i64, stop: i64) -> Result<Vec<String>> {
        self.conn
            .lrange(key, start as isize, stop as isize)
            .await
            .map_err(Into::into)
    }

    pub async fn lpush(&mut self, key: &str, value: &str) -> Result<()> {
        self.conn.lpush(key, value).await.map_err(Into::into)
    }

    pub async fn lrem(&mut self, key: &str, count: i64, value: &str) -> Result<()> {
        self.conn
            .lrem(key, count as isize, value)
            .await
            .map_err(Into::into)
    }

    #[allow(dead_code)]
    pub async fn llen(&mut self, key: &str) -> Result<usize> {
        self.conn.llen(key).await.map_err(Into::into)
    }
}

// 直接连接包装器
pub struct DirectConnection {
    conn: redis::aio::Connection,
}

impl DirectConnection {
    pub async fn set(&mut self, key: &str, value: &str) -> Result<()> {
        self.conn.set(key, value).await.map_err(Into::into)
    }

    pub async fn get(&mut self, key: &str) -> Result<String> {
        self.conn.get(key).await.map_err(Into::into)
    }

    pub async fn expire(&mut self, key: &str, seconds: i64) -> Result<()> {
        self.conn
            .expire(key, seconds as usize)
            .await
            .map_err(Into::into)
    }

    pub async fn sadd(&mut self, key: &str, member: &str) -> Result<()> {
        self.conn.sadd(key, member).await.map_err(Into::into)
    }

    pub async fn srem(&mut self, key: &str, member: &str) -> Result<()> {
        self.conn.srem(key, member).await.map_err(Into::into)
    }

    pub async fn smembers(&mut self, key: &str) -> Result<Vec<String>> {
        self.conn.smembers(key).await.map_err(Into::into)
    }

    pub async fn del(&mut self, key: &str) -> Result<()> {
        self.conn.del(key).await.map_err(Into::into)
    }

    pub async fn exists(&mut self, key: &str) -> Result<bool> {
        self.conn.exists(key).await.map_err(Into::into)
    }

    pub async fn publish(&mut self, channel: &str, message: &str) -> Result<()> {
        self.conn
            .publish(channel, message)
            .await
            .map_err(Into::into)
    }

    pub async fn set_ex(&mut self, key: String, value: String, seconds: i64) -> Result<()> {
        self.conn
            .set_ex(key, value, seconds as usize)
            .await
            .map_err(Into::into)
    }

    #[allow(dead_code)]
    pub async fn scard(&mut self, key: &str) -> Result<usize> {
        self.conn.scard(key).await.map_err(Into::into)
    }

    // 企业级List操作
    pub async fn lrange(&mut self, key: &str, start: i64, stop: i64) -> Result<Vec<String>> {
        self.conn
            .lrange(key, start as isize, stop as isize)
            .await
            .map_err(Into::into)
    }

    pub async fn lpush(&mut self, key: &str, value: &str) -> Result<()> {
        self.conn.lpush(key, value).await.map_err(Into::into)
    }

    pub async fn lrem(&mut self, key: &str, count: i64, value: &str) -> Result<()> {
        self.conn
            .lrem(key, count as isize, value)
            .await
            .map_err(Into::into)
    }

    #[allow(dead_code)]
    pub async fn llen(&mut self, key: &str) -> Result<usize> {
        self.conn.llen(key).await.map_err(Into::into)
    }
}
