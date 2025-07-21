use crate::message_enhanced::{
    EnhancedMessage, MessageCategory, MessageFilter, MessagePriority, MessageRouter, MessageStats,
    MessageStatus, SystemMessageType,
};
use chrono::{DateTime, Utc};
use flate2::{read::GzDecoder, write::GzEncoder, Compression};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::{interval, timeout};
use uuid::Uuid;

/// 消息处理配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessorConfig {
    pub batch_size: usize,              // 批量处理大小
    pub batch_timeout: Duration,        // 批量超时时间
    pub compression_threshold: usize,   // 压缩阈值（字节）
    pub max_queue_size: usize,          // 最大队列大小
    pub retry_delay: Duration,          // 重试延迟
    pub stats_interval: Duration,       // 统计间隔
    pub priority_weights: HashMap<MessagePriority, u32>, // 优先级权重
}

impl Default for ProcessorConfig {
    fn default() -> Self {
        let mut priority_weights = HashMap::new();
        priority_weights.insert(MessagePriority::Low, 1);
        priority_weights.insert(MessagePriority::Normal, 4);
        priority_weights.insert(MessagePriority::High, 16);
        priority_weights.insert(MessagePriority::Critical, 64);

        Self {
            batch_size: 100,
            batch_timeout: Duration::from_millis(50),
            compression_threshold: 1024, // 1KB
            max_queue_size: 10000,
            retry_delay: Duration::from_millis(100),
            stats_interval: Duration::from_secs(30),
            priority_weights,
        }
    }
}

/// 消息处理结果
#[derive(Debug, Clone)]
pub struct ProcessResult {
    pub success: bool,
    pub message_id: String,
    pub error: Option<String>,
    pub processing_time: Duration,
    pub compressed: bool,
    pub batched: bool,
}

/// 优先级队列项
#[derive(Debug, Clone)]
struct PriorityQueueItem {
    message: EnhancedMessage,
    priority_score: u32,
    enqueue_time: DateTime<Utc>,
}

impl PartialEq for PriorityQueueItem {
    fn eq(&self, other: &Self) -> bool {
        self.priority_score == other.priority_score
    }
}

impl Eq for PriorityQueueItem {}

impl PartialOrd for PriorityQueueItem {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for PriorityQueueItem {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        // 按优先级分数降序排列
        other.priority_score.cmp(&self.priority_score)
    }
}

/// 消息处理器
pub struct MessageProcessor {
    config: ProcessorConfig,
    router: MessageRouter,
    stats: Arc<Mutex<MessageStats>>,
    
    // 队列管理
    priority_queues: HashMap<MessagePriority, VecDeque<PriorityQueueItem>>,
    batch_buffer: Vec<EnhancedMessage>,
    last_batch_time: DateTime<Utc>,
    
    // 发送通道
    sender: mpsc::UnboundedSender<ProcessResult>,
    receiver: Arc<Mutex<mpsc::UnboundedReceiver<ProcessResult>>>,
    
    // 过滤器和处理器
    filters: HashMap<String, MessageFilter>,
    handlers: HashMap<MessageCategory, Box<dyn MessageHandler + Send + Sync>>,
}

/// 消息处理器接口
pub trait MessageHandler {
    fn handle(&self, message: &EnhancedMessage) -> Result<(), String>;
    fn get_category(&self) -> MessageCategory;
}

/// 聊天消息处理器
pub struct ChatMessageHandler;

impl MessageHandler for ChatMessageHandler {
    fn handle(&self, message: &EnhancedMessage) -> Result<(), String> {
        match message {
            EnhancedMessage::Chat { content, .. } => {
                println!("📝 处理聊天消息: {}", content);
                // 这里可以添加具体的聊天消息处理逻辑
                Ok(())
            }
            _ => Err("不是聊天消息".to_string()),
        }
    }

    fn get_category(&self) -> MessageCategory {
        MessageCategory::Chat
    }
}

/// 系统消息处理器
pub struct SystemMessageHandler;

impl MessageHandler for SystemMessageHandler {
    fn handle(&self, message: &EnhancedMessage) -> Result<(), String> {
        match message {
            EnhancedMessage::System { content, system_type, priority, .. } => {
                println!("🔔 处理系统消息 [{:?}] [{:?}]: {}", system_type, priority, content);
                
                // 根据系统消息类型执行不同的处理逻辑
                match system_type {
                    SystemMessageType::Error => {
                        // 错误处理逻辑
                        eprintln!("❌ 系统错误: {}", content);
                    }
                    SystemMessageType::Security => {
                        // 安全事件处理
                        println!("🔒 安全事件: {}", content);
                    }
                    SystemMessageType::Performance => {
                        // 性能监控处理
                        println!("📊 性能监控: {}", content);
                    }
                    _ => {
                        // 其他系统消息
                        println!("ℹ️ 系统通知: {}", content);
                    }
                }
                Ok(())
            }
            _ => Err("不是系统消息".to_string()),
        }
    }

    fn get_category(&self) -> MessageCategory {
        MessageCategory::System
    }
}

/// 状态消息处理器
pub struct StatusMessageHandler;

impl MessageHandler for StatusMessageHandler {
    fn handle(&self, message: &EnhancedMessage) -> Result<(), String> {
        match message {
            EnhancedMessage::Status { user_id, status, .. } => {
                println!("📊 用户状态更新: {} -> {:?}", user_id, status);
                Ok(())
            }
            EnhancedMessage::Typing { is_typing, .. } => {
                println!("⌨️ 输入状态: {}", if *is_typing { "正在输入" } else { "停止输入" });
                Ok(())
            }
            EnhancedMessage::Heartbeat { .. } => {
                // 心跳消息通常不需要特殊处理
                Ok(())
            }
            _ => Err("不是状态消息".to_string()),
        }
    }

    fn get_category(&self) -> MessageCategory {
        MessageCategory::Status
    }
}

impl MessageProcessor {
    /// 创建新的消息处理器
    pub fn new(config: ProcessorConfig) -> Self {
        let (sender, receiver) = mpsc::unbounded_channel();
        let mut priority_queues = HashMap::new();
        
        // 初始化优先级队列
        for priority in [
            MessagePriority::Low,
            MessagePriority::Normal,
            MessagePriority::High,
            MessagePriority::Critical,
        ] {
            priority_queues.insert(priority, VecDeque::new());
        }

        let mut processor = Self {
            config,
            router: MessageRouter::new(),
            stats: Arc::new(Mutex::new(MessageStats {
                total_messages: 0,
                by_type: HashMap::new(),
                by_priority: HashMap::new(),
                by_status: HashMap::new(),
                average_size: 0,
                compression_ratio: 0.0,
            })),
            priority_queues,
            batch_buffer: Vec::new(),
            last_batch_time: Utc::now(),
            sender,
            receiver: Arc::new(Mutex::new(receiver)),
            filters: HashMap::new(),
            handlers: HashMap::new(),
        };

        // 注册默认处理器
        processor.register_handler(Box::new(ChatMessageHandler));
        processor.register_handler(Box::new(SystemMessageHandler));
        processor.register_handler(Box::new(StatusMessageHandler));

        processor
    }

    /// 注册消息处理器
    pub fn register_handler(&mut self, handler: Box<dyn MessageHandler + Send + Sync>) {
        let category = handler.get_category();
        self.handlers.insert(category, handler);
    }

    /// 添加过滤器
    pub fn add_filter(&mut self, name: String, filter: MessageFilter) {
        self.filters.insert(name.clone(), filter.clone());
        self.router.add_filter(name, filter);
    }

    /// 订阅消息
    pub fn subscribe(&mut self, user_id: String, filter_name: String) {
        self.router.subscribe(user_id, filter_name);
    }

    /// 处理消息
    pub async fn process_message(&mut self, mut message: EnhancedMessage) -> ProcessResult {
        let start_time = std::time::Instant::now();
        let message_id = message.get_id().to_string();
        
        // 应用过滤器
        let passed_filters = self.apply_filters(&message);
        if passed_filters.is_empty() {
            return ProcessResult {
                success: false,
                message_id,
                error: Some("消息被过滤器拒绝".to_string()),
                processing_time: start_time.elapsed(),
                compressed: false,
                batched: false,
            };
        }

        // 检查是否需要压缩
        let compressed = self.maybe_compress_message(&mut message);

        // 添加到优先级队列
        let priority = message.get_priority();
        let priority_score = self.calculate_priority_score(&message);
        
        let queue_item = PriorityQueueItem {
            message: message.clone(),
            priority_score,
            enqueue_time: Utc::now(),
        };

        if let Some(queue) = self.priority_queues.get_mut(&priority) {
            if queue.len() >= self.config.max_queue_size {
                return ProcessResult {
                    success: false,
                    message_id,
                    error: Some("队列已满".to_string()),
                    processing_time: start_time.elapsed(),
                    compressed,
                    batched: false,
                };
            }
            queue.push_back(queue_item);
        }

        // 更新统计信息
        self.update_stats(&message);

        // 尝试处理消息
        let result = self.handle_message(&message).await;
        
        ProcessResult {
            success: result.is_ok(),
            message_id,
            error: result.err(),
            processing_time: start_time.elapsed(),
            compressed,
            batched: false,
        }
    }

    /// 批量处理消息
    pub async fn process_batch(&mut self) -> Vec<ProcessResult> {
        let mut results = Vec::new();
        let mut batch_messages = Vec::new();
        
        // 从优先级队列中收集消息
        for priority in [
            MessagePriority::Critical,
            MessagePriority::High,
            MessagePriority::Normal,
            MessagePriority::Low,
        ] {
            if let Some(queue) = self.priority_queues.get_mut(&priority) {
                while !queue.is_empty() && batch_messages.len() < self.config.batch_size {
                    if let Some(item) = queue.pop_front() {
                        batch_messages.push(item.message);
                    }
                }
            }
        }

        if batch_messages.is_empty() {
            return results;
        }

        // 创建批量消息
        let batch_id = Uuid::new_v4().to_string();
        let mut enhanced_batch = EnhancedMessage::Batch {
            metadata: crate::message_enhanced::MessageMetadata {
                id: batch_id.clone(),
                correlation_id: None,
                reply_to: None,
                thread_id: None,
                tags: vec!["batch".to_string()],
                custom_fields: HashMap::new(),
            },
            messages: batch_messages.clone(),
            timestamp: Utc::now(),
            compression_type: None,
            options: crate::message_enhanced::MessageOptions {
                compress: true,
                persist: true,
                ttl: None,
                retry_count: 1,
                batch_id: Some(batch_id.clone()),
            },
        };

        // 压缩批量消息
        let compressed = self.maybe_compress_message(&mut enhanced_batch);
        if compressed {
            if let EnhancedMessage::Batch { compression_type, .. } = &mut enhanced_batch {
                *compression_type = Some("gzip".to_string());
            }
        }

        // 处理批量消息中的每个消息
        for message in batch_messages {
            let start_time = std::time::Instant::now();
            let message_id = message.get_id().to_string();
            
            let result = self.handle_message(&message).await;
            
            results.push(ProcessResult {
                success: result.is_ok(),
                message_id,
                error: result.err(),
                processing_time: start_time.elapsed(),
                compressed,
                batched: true,
            });
        }

        self.last_batch_time = Utc::now();
        results
    }

    /// 应用消息过滤器
    fn apply_filters(&self, message: &EnhancedMessage) -> Vec<String> {
        let mut passed_filters = Vec::new();
        
        for (filter_name, filter) in &self.filters {
            if message.matches_filter(filter) {
                passed_filters.push(filter_name.clone());
            }
        }
        
        passed_filters
    }

    /// 计算优先级分数
    fn calculate_priority_score(&self, message: &EnhancedMessage) -> u32 {
        let base_priority = message.get_priority();
        let base_score = *self.config.priority_weights.get(&base_priority).unwrap_or(&1);
        
        // 根据消息年龄调整分数（越老分数越高）
        let age_factor = match message {
            EnhancedMessage::Chat { timestamp, .. } |
            EnhancedMessage::System { timestamp, .. } |
            EnhancedMessage::Status { timestamp, .. } |
            EnhancedMessage::Control { timestamp, .. } => {
                let age = Utc::now().signed_duration_since(*timestamp);
                (age.num_seconds() / 10).max(0) as u32 // 每10秒增加1分
            }
            _ => 0,
        };
        
        base_score + age_factor
    }

    /// 压缩消息（如果需要）
    fn maybe_compress_message(&self, message: &mut EnhancedMessage) -> bool {
        let message_size = self.estimate_message_size(message);
        
        if message_size > self.config.compression_threshold {
            // 在实际应用中，这里应该实现真正的压缩逻辑
            // 现在只是标记消息应该被压缩
            match message {
                EnhancedMessage::Chat { options, .. } |
                EnhancedMessage::System { options, .. } |
                EnhancedMessage::Status { options, .. } |
                EnhancedMessage::Control { options, .. } => {
                    options.compress = true;
                }
                _ => {}
            }
            true
        } else {
            false
        }
    }

    /// 估算消息大小
    fn estimate_message_size(&self, message: &EnhancedMessage) -> usize {
        // 简单的大小估算，实际应用中可以使用更精确的方法
        match serde_json::to_string(message) {
            Ok(json) => json.len(),
            Err(_) => 0,
        }
    }

    /// 处理具体消息
    async fn handle_message(&self, message: &EnhancedMessage) -> Result<(), String> {
        let category = message.get_category();
        
        if let Some(handler) = self.handlers.get(&category) {
            handler.handle(message)
        } else {
            Err(format!("未找到 {:?} 类型的处理器", category))
        }
    }

    /// 更新统计信息
    fn update_stats(&self, message: &EnhancedMessage) {
        if let Ok(mut stats) = self.stats.lock() {
            stats.total_messages += 1;
            
            // 按类型统计
            let type_name = format!("{:?}", message.get_category());
            *stats.by_type.entry(type_name).or_insert(0) += 1;
            
            // 按优先级统计
            let priority = message.get_priority();
            *stats.by_priority.entry(priority).or_insert(0) += 1;
            
            // 更新平均大小
            let message_size = self.estimate_message_size(message) as u64;
            stats.average_size = (stats.average_size * (stats.total_messages - 1) + message_size) / stats.total_messages;
        }
    }

    /// 获取统计信息
    pub fn get_stats(&self) -> Option<MessageStats> {
        self.stats.lock().ok().map(|stats| stats.clone())
    }

    /// 启动后台处理任务
    pub async fn start_background_processing(&mut self) {
        let mut batch_interval = interval(self.config.batch_timeout);
        let mut stats_interval = interval(self.config.stats_interval);
        
        loop {
            tokio::select! {
                _ = batch_interval.tick() => {
                    // 检查是否需要处理批量消息
                    let should_process = self.batch_buffer.len() >= self.config.batch_size ||
                        Utc::now().signed_duration_since(self.last_batch_time) >= 
                        chrono::Duration::from_std(self.config.batch_timeout).unwrap_or_default();
                    
                    if should_process {
                        let results = self.process_batch().await;
                        for result in results {
                            if let Err(_) = self.sender.send(result) {
                                eprintln!("❌ 发送处理结果失败");
                            }
                        }
                    }
                }
                
                _ = stats_interval.tick() => {
                    // 打印统计信息
                    if let Some(stats) = self.get_stats() {
                        self.print_stats(&stats);
                    }
                }
            }
        }
    }

    /// 打印统计信息
    fn print_stats(&self, stats: &MessageStats) {
        println!("📊 消息处理统计:");
        println!("  总消息数: {}", stats.total_messages);
        println!("  平均大小: {} 字节", stats.average_size);
        println!("  压缩率: {:.2}%", stats.compression_ratio * 100.0);
        
        println!("  按类型统计:");
        for (msg_type, count) in &stats.by_type {
            println!("    {}: {}", msg_type, count);
        }
        
        println!("  按优先级统计:");
        for (priority, count) in &stats.by_priority {
            println!("    {:?}: {}", priority, count);
        }
    }
}

/// 消息压缩工具
pub struct MessageCompressor;

impl MessageCompressor {
    /// 压缩数据
    pub fn compress(data: &[u8]) -> Result<Vec<u8>, std::io::Error> {
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data)?;
        encoder.finish()
    }

    /// 解压数据
    pub fn decompress(data: &[u8]) -> Result<Vec<u8>, std::io::Error> {
        let mut decoder = GzDecoder::new(data);
        let mut result = Vec::new();
        decoder.read_to_end(&mut result)?;
        Ok(result)
    }

    /// 压缩消息
    pub fn compress_message(message: &EnhancedMessage) -> Result<Vec<u8>, String> {
        let json = serde_json::to_string(message)
            .map_err(|e| format!("序列化失败: {}", e))?;
        
        Self::compress(json.as_bytes())
            .map_err(|e| format!("压缩失败: {}", e))
    }

    /// 解压消息
    pub fn decompress_message(data: &[u8]) -> Result<EnhancedMessage, String> {
        let decompressed = Self::decompress(data)
            .map_err(|e| format!("解压失败: {}", e))?;
        
        let json = String::from_utf8(decompressed)
            .map_err(|e| format!("UTF-8解码失败: {}", e))?;
        
        serde_json::from_str(&json)
            .map_err(|e| format!("反序列化失败: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::message_enhanced::{ContentType, EnhancedMessage};

    #[tokio::test]
    async fn test_message_processor() {
        let config = ProcessorConfig::default();
        let mut processor = MessageProcessor::new(config);

        let message = EnhancedMessage::new_chat(
            "user1".to_string(),
            "user2".to_string(),
            "Hello World".to_string(),
            ContentType::Text,
        );

        let result = processor.process_message(message).await;
        assert!(result.success);
    }

    #[test]
    fn test_message_compression() {
        let data = b"Hello, this is a test message for compression!";
        let compressed = MessageCompressor::compress(data).unwrap();
        let decompressed = MessageCompressor::decompress(&compressed).unwrap();
        
        assert_eq!(data, decompressed.as_slice());
        assert!(compressed.len() < data.len() || data.len() < 50); // 小数据可能不会压缩
    }
} 