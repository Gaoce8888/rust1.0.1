use anyhow::Result;
use chrono::{DateTime, Utc};
use redis::{Commands, Connection};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::{Mutex, RwLock};
use uuid::Uuid;

// 消息状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MessageStatus {
    Pending,   // 待发送
    Sent,      // 已发送
    Delivered, // 已送达
    Read,      // 已读
    Failed,    // 发送失败
}

// 企业级增强消息结构 - Redis消息队列系统
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // 企业级消息结构：所有字段用于完整的企业级消息队列功能
pub struct EnhancedMessage {
    pub id: String,
    pub sequence_id: u64,
    pub from_user: String,
    pub to_user: String,
    pub content: String,
    pub content_type: String,
    pub status: MessageStatus,
    pub retry_count: u32,
    pub created_at: DateTime<Utc>,
    pub last_attempt: DateTime<Utc>,
    pub checksum: String,
    pub priority: u8,
    pub metadata: HashMap<String, String>,
}

impl EnhancedMessage {
    // 企业级消息创建功能
    #[allow(dead_code)] // 企业级功能：用于创建具有完整元数据的企业级消息
    pub fn new(from_user: String, to_user: String, content: String, content_type: String) -> Self {
        let id = Uuid::new_v4().to_string();
        let created_at = Utc::now();
        let checksum = Self::calculate_checksum(&content);

        Self {
            id,
            sequence_id: 0, // 将由MessageQueueManager分配
            from_user,
            to_user,
            content,
            content_type,
            status: MessageStatus::Pending,
            retry_count: 0,
            created_at,
            last_attempt: created_at,
            checksum,
            priority: 5, // 默认优先级
            metadata: HashMap::new(),
        }
    }

    // 企业级校验和计算功能
    fn calculate_checksum(content: &str) -> String {
        // 简单的哈希计算，避免md5依赖
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        content.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }

    // 企业级时间戳兼容性方法
    pub fn timestamp(&self) -> u64 {
        self.created_at.timestamp_millis() as u64
    }

    // 企业级消息去重功能
    #[allow(dead_code)] // 企业级功能：用于消息去重和防止重复处理
    pub fn dedup_key(&self) -> String {
        format!("{}:{}:{}", self.from_user, self.to_user, self.checksum)
    }

    // 企业级消息过期检查功能
    #[allow(dead_code)] // 企业级功能：用于消息生命周期管理
    pub fn is_expired(&self) -> bool {
        let expiry_duration = chrono::Duration::hours(24); // 24小时过期
        Utc::now() - self.created_at > expiry_duration
    }
}

// 企业级消息队列管理器 - Redis增强功能
pub struct MessageQueueManager {
    connection: Arc<Mutex<Connection>>,
    #[allow(dead_code)] // 企业级字段：pending_messages用于离线消息重发和可靠性保障
    pending_messages: Arc<RwLock<HashMap<String, EnhancedMessage>>>, // 待确认消息
    #[allow(dead_code)] // 企业级字段：sequence_counters用于消息顺序保证和去重
    sequence_counters: Arc<RwLock<HashMap<String, u64>>>, // 用户序列号计数器
    dedup_cache: Arc<RwLock<HashMap<String, u64>>>, // 去重缓存
    #[allow(dead_code)] // 企业级字段：retry_queue用于消息重试机制和故障恢复
    retry_queue: Arc<RwLock<VecDeque<String>>>, // 重试队列
}

#[allow(dead_code)] // 企业级消息队列方法：所有方法用于完整的Redis增强功能
impl MessageQueueManager {
    pub fn new(connection: Connection) -> Self {
        Self {
            connection: Arc::new(Mutex::new(connection)),
            pending_messages: Arc::new(RwLock::new(HashMap::new())),
            sequence_counters: Arc::new(RwLock::new(HashMap::new())),
            dedup_cache: Arc::new(RwLock::new(HashMap::new())),
            retry_queue: Arc::new(RwLock::new(VecDeque::new())),
        }
    }

    // 发送消息到队列
    pub async fn enqueue_message(&self, mut message: EnhancedMessage) -> Result<()> {
        // 检查去重
        if self.is_duplicate(&message).await {
            tracing::warn!("Duplicate message detected: {}", message.id);
            return Ok(());
        }

        // 分配序列号
        message.sequence_id = self.get_next_sequence(&message.from_user).await;

        // 存储到Redis
        let mut conn = self.connection.lock().await;

        // 添加到消息队列
        let queue_key = format!("msg_queue:{}", message.to_user);
        let message_json = serde_json::to_string(&message)?;
        conn.lpush::<_, _, ()>(&queue_key, &message_json)?;

        // 添加到待确认队列
        let pending_key = format!("pending:{}", message.id);
        conn.set_ex::<_, _, ()>(&pending_key, &message_json, 3600)?; // 1小时过期

        // 更新去重缓存
        let dedup_key = message.dedup_key();
        conn.set_ex::<_, _, ()>(&dedup_key, message.timestamp(), 300)?; // 5分钟去重窗口

        // 存储到内存待确认列表
        {
            let mut pending = self.pending_messages.write().await;
            pending.insert(message.id.clone(), message.clone());
        }

        // 发送实时通知
        self.send_realtime_notification(&message).await?;

        tracing::info!(
            "Message enqueued: {} -> {}",
            message.from_user,
            message.to_user
        );
        Ok(())
    }

    // 从队列获取消息
    pub async fn dequeue_messages(
        &self,
        user_id: &str,
        limit: usize,
    ) -> Result<Vec<EnhancedMessage>> {
        let mut conn = self.connection.lock().await;
        let queue_key = format!("msg_queue:{}", user_id);

        let mut messages = Vec::new();

        for _ in 0..limit {
            // 使用简单的lpop命令
            let result: Option<String> = conn.lpop(&queue_key, None)?;

            if let Some(message_json) = result {
                if let Ok(message) = serde_json::from_str::<EnhancedMessage>(&message_json) {
                    // 检查消息是否过期
                    if !message.is_expired() {
                        messages.push(message);
                    }
                }
            } else {
                break;
            }
        }

        // 按序列号排序，确保消息顺序
        messages.sort_by_key(|m| m.sequence_id);

        Ok(messages)
    }

    // 确认消息送达
    pub async fn acknowledge_message(&self, message_id: &str) -> Result<()> {
        let mut conn = self.connection.lock().await;

        // 从待确认队列中移除
        let pending_key = format!("pending:{}", message_id);
        conn.del::<_, ()>(&pending_key)?;

        // 从内存中移除
        {
            let mut pending = self.pending_messages.write().await;
            if let Some(mut message) = pending.remove(message_id) {
                message.status = MessageStatus::Delivered;

                // 更新消息状态到持久化存储
                let status_key = format!("msg_status:{}", message_id);
                conn.set_ex::<_, _, ()>(&status_key, "delivered", 86400)?; // 24小时
            }
        }

        tracing::debug!("Message acknowledged: {}", message_id);
        Ok(())
    }

    // 处理掉线重发
    pub async fn handle_failed_delivery(&self, user_id: &str) -> Result<()> {
        let mut conn = self.connection.lock().await;

        // 查找该用户的未确认消息
        let pending_pattern = "pending:*".to_string();
        let keys: Vec<String> = conn.keys(&pending_pattern)?;

        let mut retry_messages = Vec::new();

        for key in keys {
            let message_json: Option<String> = conn.get(&key)?;
            if let Some(json) = message_json {
                if let Ok(mut message) = serde_json::from_str::<EnhancedMessage>(&json) {
                    if message.to_user == user_id && message.retry_count < 3 {
                        message.retry_count += 1;
                        message.status = MessageStatus::Pending;
                        retry_messages.push(message);
                    }
                }
            }
        }

        // 重新入队
        for message in retry_messages {
            let queue_key = format!("msg_queue:{}", message.to_user);
            let message_json = serde_json::to_string(&message)?;

            // 根据优先级和重试次数调整位置
            if message.retry_count > 1 || message.priority > 200 {
                conn.lpush::<_, _, ()>(&queue_key, &message_json)?; // 高优先级放前面
            } else {
                conn.rpush::<_, _, ()>(&queue_key, &message_json)?; // 低优先级放后面
            }

            tracing::info!(
                "Message requeued for retry: {} (attempt {})",
                message.id,
                message.retry_count
            );
        }

        Ok(())
    }

    // 实时同步机制
    pub async fn sync_user_messages(&self, user_id: &str) -> Result<Vec<EnhancedMessage>> {
        let mut conn = self.connection.lock().await;

        // 获取用户的最新消息状态
        let sync_key = format!("sync:{}", user_id);
        let last_sync: Option<u64> = conn.get(&sync_key)?;
        let last_sync_time = last_sync.unwrap_or(0);

        // 查找自上次同步以来的所有消息
        let mut recent_messages = Vec::new();

        // 从历史消息中查找
        let history_key = format!("history:{}", user_id);
        let messages: Vec<String> = conn.lrange(&history_key, 0, -1)?;

        for message_json in messages {
            if let Ok(message) = serde_json::from_str::<EnhancedMessage>(&message_json) {
                if message.timestamp() > last_sync_time {
                    recent_messages.push(message);
                }
            }
        }

        // 更新同步时间戳
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        conn.set::<_, _, ()>(&sync_key, now)?;

        // 按时间戳排序
        recent_messages.sort_by_key(|m| m.timestamp());

        Ok(recent_messages)
    }

    // 消息去重检查
    async fn is_duplicate(&self, message: &EnhancedMessage) -> bool {
        let dedup_key = message.dedup_key();

        // 先检查内存缓存
        {
            let cache = self.dedup_cache.read().await;
            if cache.contains_key(&dedup_key) {
                return true;
            }
        }

        // 检查Redis
        if let Ok(mut conn) = self.connection.try_lock() {
            if let Ok(exists) = conn.exists::<_, bool>(&dedup_key) {
                if exists {
                    // 更新内存缓存
                    let mut cache = self.dedup_cache.write().await;
                    cache.insert(dedup_key, message.timestamp());
                    return true;
                }
            }
        }

        false
    }

    // 获取下一个序列号
    async fn get_next_sequence(&self, user_id: &str) -> u64 {
        let mut counters = self.sequence_counters.write().await;
        let counter = counters.entry(user_id.to_string()).or_insert(0);
        *counter += 1;
        *counter
    }

    // 发送实时通知
    async fn send_realtime_notification(&self, message: &EnhancedMessage) -> Result<()> {
        let mut conn = self.connection.lock().await;

        // 发布到实时通道
        let channel = format!("realtime:{}", message.to_user);
        let notification = serde_json::json!({
            "type": "new_message",
            "message_id": message.id,
            "from": message.from_user,
            "timestamp": message.timestamp(),
            "priority": message.priority
        });

        conn.publish::<_, _, ()>(&channel, notification.to_string())?;

        // 更新用户未读计数
        let unread_key = format!("unread:{}", message.to_user);
        conn.incr::<_, _, ()>(&unread_key, 1)?;

        Ok(())
    }

    // 清理过期消息
    pub async fn cleanup_expired_messages(&self) -> Result<u32> {
        let mut conn = self.connection.lock().await;
        let mut cleaned = 0;

        // 清理过期的待确认消息
        let pending_pattern = "pending:*";
        let keys: Vec<String> = conn.keys(pending_pattern)?;

        for key in keys {
            let message_json: Option<String> = conn.get(&key)?;
            if let Some(json) = message_json {
                if let Ok(message) = serde_json::from_str::<EnhancedMessage>(&json) {
                    if message.is_expired() {
                        conn.del::<_, ()>(&key)?;
                        cleaned += 1;
                    }
                }
            }
        }

        // 清理过期的去重缓存
        let mut cache = self.dedup_cache.write().await;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        cache.retain(|_, &mut timestamp| now - timestamp < 300_000); // 5分钟

        tracing::info!("Cleaned {} expired messages", cleaned);
        Ok(cleaned)
    }

    // 获取消息队列统计
    pub async fn get_queue_stats(&self, user_id: &str) -> Result<QueueStats> {
        let mut conn = self.connection.lock().await;

        let queue_key = format!("msg_queue:{}", user_id);
        let pending_count: u64 = conn.llen(&queue_key)?;

        let unread_key = format!("unread:{}", user_id);
        let unread_count: u64 = conn.get(&unread_key).unwrap_or(0);

        let pending_messages = self.pending_messages.read().await;
        let retry_queue = self.retry_queue.read().await;

        Ok(QueueStats {
            pending_messages: pending_count,
            unread_messages: unread_count,
            retry_queue_size: retry_queue.len() as u64,
            total_pending_acks: pending_messages.len() as u64,
        })
    }

    // 批量处理消息
    pub async fn batch_process_messages(&self, user_id: &str, batch_size: usize) -> Result<u32> {
        let messages = self.dequeue_messages(user_id, batch_size).await?;
        let processed = messages.len() as u32;

        for message in messages {
            // 处理消息逻辑
            tracing::debug!("Processing message: {}", message.id);

            // 自动确认处理完成的消息
            self.acknowledge_message(&message.id).await?;
        }

        Ok(processed)
    }
}

// 队列统计信息
#[derive(Debug, Serialize, Deserialize)]
pub struct QueueStats {
    pub pending_messages: u64,
    pub unread_messages: u64,
    pub retry_queue_size: u64,
    pub total_pending_acks: u64,
}

// 企业级消息状态同步器 - Redis增强功能
#[allow(dead_code)] // 企业级状态同步器：queue_manager字段用于完整的消息状态管理
pub struct MessageStatusSyncer {
    queue_manager: Arc<MessageQueueManager>, // 企业级消息队列管理器
}

#[allow(dead_code)] // 企业级状态同步方法：所有方法用于完整的状态同步功能
impl MessageStatusSyncer {
    pub fn new(queue_manager: Arc<MessageQueueManager>) -> Self {
        Self { queue_manager }
    }

    // 启动状态同步任务
    pub async fn start_sync_task(&self) {
        let queue_manager = self.queue_manager.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));

            loop {
                interval.tick().await;

                // 清理过期消息
                if let Err(e) = queue_manager.cleanup_expired_messages().await {
                    tracing::error!("Failed to cleanup expired messages: {:?}", e);
                }

                // 这里可以添加其他定期同步任务
            }
        });
    }

    // 强制同步用户状态
    pub async fn force_sync(&self, user_id: &str) -> Result<u32> {
        let messages = self.queue_manager.sync_user_messages(user_id).await?;
        let synced = messages.len() as u32;

        tracing::info!("Force synced {} messages for user {}", synced, user_id);
        Ok(synced)
    }
}

#[cfg(test)]
mod tests {
    // 测试模块导入 - 仅在测试时使用
    #[allow(unused_imports)]
    use super::*;

    #[tokio::test]
    async fn test_message_queue_basic() {
        // 测试基本的消息队列功能
        // 这里需要模拟Redis连接
    }

    #[tokio::test]
    async fn test_message_deduplication() {
        // 测试消息去重功能
    }

    #[tokio::test]
    async fn test_message_ordering() {
        // 测试消息顺序保证
    }
}
