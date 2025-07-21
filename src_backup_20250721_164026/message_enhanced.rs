use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// 消息优先级枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum MessagePriority {
    Low = 1,       // 非关键信息，如打字指示器
    Normal = 2,    // 普通聊天消息
    High = 3,      // 重要系统通知
    Critical = 4,  // 紧急警报和错误
}

/// 消息类别枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MessageCategory {
    Chat,       // 用户聊天
    System,     // 系统消息
    Status,     // 状态更新
    Control,    // 控制命令
    Analytics,  // 统计分析
}

/// 系统消息子类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SystemMessageType {
    UserAction,      // 用户操作（加入、离开）
    ServiceStatus,   // 服务状态
    Security,        // 安全相关
    Performance,     // 性能监控
    Configuration,   // 配置变更
    Error,           // 错误信息
    Notification,    // 通知消息
}

/// 消息状态枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum MessageStatus {
    Pending,    // 待发送
    Sent,       // 已发送
    Delivered,  // 已送达
    Read,       // 已读
    Failed,     // 发送失败
}

/// 内容类型扩展
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ContentType {
    Text,
    Image,
    File,
    Voice,
    Video,
    Html,           // 富文本
    Markdown,       // Markdown格式
    Json,           // JSON数据
    Binary,         // 二进制数据
}

/// 消息路由信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageRoute {
    pub from: String,
    pub to: Vec<String>,        // 支持多目标
    pub room_id: Option<String>, // 房间ID
    pub broadcast: bool,         // 是否广播
    pub exclude: Vec<String>,    // 排除的用户ID
}

/// 消息元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageMetadata {
    pub id: String,
    pub correlation_id: Option<String>, // 关联ID，用于追踪
    pub reply_to: Option<String>,       // 回复的消息ID
    pub thread_id: Option<String>,      // 话题ID
    pub tags: Vec<String>,              // 标签
    pub custom_fields: HashMap<String, String>, // 自定义字段
}

/// 性能优化配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageOptions {
    pub compress: bool,         // 是否压缩
    pub persist: bool,          // 是否持久化
    pub ttl: Option<u64>,       // 生存时间（秒）
    pub retry_count: u32,       // 重试次数
    pub batch_id: Option<String>, // 批量消息ID
}

/// 增强版消息结构
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum EnhancedMessage {
    /// 聊天消息
    #[serde(rename = "Chat")]
    Chat {
        metadata: MessageMetadata,
        route: MessageRoute,
        content: String,
        content_type: ContentType,
        filename: Option<String>,
        url: Option<String>,
        timestamp: DateTime<Utc>,
        priority: MessagePriority,
        status: MessageStatus,
        options: MessageOptions,
    },

    /// 系统消息
    #[serde(rename = "System")]
    System {
        metadata: MessageMetadata,
        route: MessageRoute,
        content: String,
        system_type: SystemMessageType,
        timestamp: DateTime<Utc>,
        priority: MessagePriority,
        data: Option<serde_json::Value>, // 附加数据
        options: MessageOptions,
    },

    /// 打字指示器
    #[serde(rename = "Typing")]
    Typing {
        metadata: MessageMetadata,
        route: MessageRoute,
        is_typing: bool,
        timestamp: DateTime<Utc>,
        options: MessageOptions,
    },

    /// 心跳检测
    #[serde(rename = "Heartbeat")]
    Heartbeat {
        metadata: MessageMetadata,
        user_id: Option<String>,
        timestamp: DateTime<Utc>,
        health_data: Option<serde_json::Value>, // 健康数据
        options: MessageOptions,
    },

    /// 状态更新
    #[serde(rename = "Status")]
    Status {
        metadata: MessageMetadata,
        route: MessageRoute,
        user_id: String,
        status: OnlineStatus,
        previous_status: Option<OnlineStatus>,
        timestamp: DateTime<Utc>,
        priority: MessagePriority,
        options: MessageOptions,
    },

    /// 批量消息
    #[serde(rename = "Batch")]
    Batch {
        metadata: MessageMetadata,
        messages: Vec<EnhancedMessage>,
        timestamp: DateTime<Utc>,
        compression_type: Option<String>,
        options: MessageOptions,
    },

    /// 控制消息
    #[serde(rename = "Control")]
    Control {
        metadata: MessageMetadata,
        route: MessageRoute,
        command: String,
        parameters: HashMap<String, serde_json::Value>,
        timestamp: DateTime<Utc>,
        priority: MessagePriority,
        options: MessageOptions,
    },

    /// 分析消息
    #[serde(rename = "Analytics")]
    Analytics {
        metadata: MessageMetadata,
        event_type: String,
        data: serde_json::Value,
        timestamp: DateTime<Utc>,
        options: MessageOptions,
    },
}

/// 用户状态枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum OnlineStatus {
    Online,
    Offline,
    Away,
    Busy,
    DoNotDisturb,
}

/// 用户类型枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum UserType {
    Kefu,     // 客服
    Kehu,     // 客户
    Admin,    // 管理员
    System,   // 系统用户
}

/// 消息过滤器
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageFilter {
    pub categories: Vec<MessageCategory>,
    pub priorities: Vec<MessagePriority>,
    pub user_types: Vec<UserType>,
    pub tags: Vec<String>,
    pub time_range: Option<(DateTime<Utc>, DateTime<Utc>)>,
}

/// 消息统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageStats {
    pub total_messages: u64,
    pub by_type: HashMap<String, u64>,
    pub by_priority: HashMap<MessagePriority, u64>,
    pub by_status: HashMap<MessageStatus, u64>,
    pub average_size: u64,
    pub compression_ratio: f64,
}

impl EnhancedMessage {
    /// 创建聊天消息
    pub fn new_chat(
        from: String,
        to: String,
        content: String,
        content_type: ContentType,
    ) -> Self {
        let id = Uuid::new_v4().to_string();
        EnhancedMessage::Chat {
            metadata: MessageMetadata {
                id: id.clone(),
                correlation_id: None,
                reply_to: None,
                thread_id: None,
                tags: vec![],
                custom_fields: HashMap::new(),
            },
            route: MessageRoute {
                from,
                to: vec![to],
                room_id: None,
                broadcast: false,
                exclude: vec![],
            },
            content,
            content_type,
            filename: None,
            url: None,
            timestamp: Utc::now(),
            priority: MessagePriority::Normal,
            status: MessageStatus::Pending,
            options: MessageOptions {
                compress: false,
                persist: true,
                ttl: None,
                retry_count: 3,
                batch_id: None,
            },
        }
    }

    /// 创建系统消息
    pub fn new_system(
        content: String,
        system_type: SystemMessageType,
        priority: MessagePriority,
    ) -> Self {
        let id = Uuid::new_v4().to_string();
        EnhancedMessage::System {
            metadata: MessageMetadata {
                id: id.clone(),
                correlation_id: None,
                reply_to: None,
                thread_id: None,
                tags: vec![],
                custom_fields: HashMap::new(),
            },
            route: MessageRoute {
                from: "system".to_string(),
                to: vec![],
                room_id: None,
                broadcast: true,
                exclude: vec![],
            },
            content,
            system_type,
            timestamp: Utc::now(),
            priority,
            data: None,
            options: MessageOptions {
                compress: false,
                persist: true,
                ttl: Some(3600), // 1小时
                retry_count: 1,
                batch_id: None,
            },
        }
    }

    /// 获取消息ID
    pub fn get_id(&self) -> &str {
        match self {
            EnhancedMessage::Chat { metadata, .. } => &metadata.id,
            EnhancedMessage::System { metadata, .. } => &metadata.id,
            EnhancedMessage::Typing { metadata, .. } => &metadata.id,
            EnhancedMessage::Heartbeat { metadata, .. } => &metadata.id,
            EnhancedMessage::Status { metadata, .. } => &metadata.id,
            EnhancedMessage::Batch { metadata, .. } => &metadata.id,
            EnhancedMessage::Control { metadata, .. } => &metadata.id,
            EnhancedMessage::Analytics { metadata, .. } => &metadata.id,
        }
    }

    /// 获取消息优先级
    pub fn get_priority(&self) -> MessagePriority {
        match self {
            EnhancedMessage::Chat { priority, .. } => priority.clone(),
            EnhancedMessage::System { priority, .. } => priority.clone(),
            EnhancedMessage::Status { priority, .. } => priority.clone(),
            EnhancedMessage::Control { priority, .. } => priority.clone(),
            EnhancedMessage::Typing { .. } => MessagePriority::Low,
            EnhancedMessage::Heartbeat { .. } => MessagePriority::Low,
            EnhancedMessage::Batch { .. } => MessagePriority::Normal,
            EnhancedMessage::Analytics { .. } => MessagePriority::Low,
        }
    }

    /// 获取消息分类
    pub fn get_category(&self) -> MessageCategory {
        match self {
            EnhancedMessage::Chat { .. } => MessageCategory::Chat,
            EnhancedMessage::System { .. } => MessageCategory::System,
            EnhancedMessage::Typing { .. } => MessageCategory::Status,
            EnhancedMessage::Heartbeat { .. } => MessageCategory::Status,
            EnhancedMessage::Status { .. } => MessageCategory::Status,
            EnhancedMessage::Batch { .. } => MessageCategory::Control,
            EnhancedMessage::Control { .. } => MessageCategory::Control,
            EnhancedMessage::Analytics { .. } => MessageCategory::Analytics,
        }
    }

    /// 检查消息是否匹配过滤器
    pub fn matches_filter(&self, filter: &MessageFilter) -> bool {
        // 检查分类
        if !filter.categories.is_empty() && !filter.categories.contains(&self.get_category()) {
            return false;
        }

        // 检查优先级
        if !filter.priorities.is_empty() && !filter.priorities.contains(&self.get_priority()) {
            return false;
        }

        // 检查标签
        if !filter.tags.is_empty() {
            let message_tags = match self {
                EnhancedMessage::Chat { metadata, .. } => &metadata.tags,
                EnhancedMessage::System { metadata, .. } => &metadata.tags,
                EnhancedMessage::Typing { metadata, .. } => &metadata.tags,
                EnhancedMessage::Heartbeat { metadata, .. } => &metadata.tags,
                EnhancedMessage::Status { metadata, .. } => &metadata.tags,
                EnhancedMessage::Batch { metadata, .. } => &metadata.tags,
                EnhancedMessage::Control { metadata, .. } => &metadata.tags,
                EnhancedMessage::Analytics { metadata, .. } => &metadata.tags,
            };

            if !filter.tags.iter().any(|tag| message_tags.contains(tag)) {
                return false;
            }
        }

        true
    }

    /// 设置批量ID
    pub fn set_batch_id(&mut self, batch_id: String) {
        match self {
            EnhancedMessage::Chat { options, .. } => options.batch_id = Some(batch_id),
            EnhancedMessage::System { options, .. } => options.batch_id = Some(batch_id),
            EnhancedMessage::Typing { options, .. } => options.batch_id = Some(batch_id),
            EnhancedMessage::Heartbeat { options, .. } => options.batch_id = Some(batch_id),
            EnhancedMessage::Status { options, .. } => options.batch_id = Some(batch_id),
            EnhancedMessage::Batch { options, .. } => options.batch_id = Some(batch_id),
            EnhancedMessage::Control { options, .. } => options.batch_id = Some(batch_id),
            EnhancedMessage::Analytics { options, .. } => options.batch_id = Some(batch_id),
        }
    }
}

/// 消息路由器
pub struct MessageRouter {
    filters: HashMap<String, MessageFilter>,
    subscribers: HashMap<String, Vec<String>>, // 订阅关系
}

impl MessageRouter {
    pub fn new() -> Self {
        Self {
            filters: HashMap::new(),
            subscribers: HashMap::new(),
        }
    }

    /// 添加过滤器
    pub fn add_filter(&mut self, name: String, filter: MessageFilter) {
        self.filters.insert(name, filter);
    }

    /// 订阅消息
    pub fn subscribe(&mut self, user_id: String, filter_name: String) {
        self.subscribers
            .entry(filter_name)
            .or_insert_with(Vec::new)
            .push(user_id);
    }

    /// 路由消息
    pub fn route_message(&self, message: &EnhancedMessage) -> Vec<String> {
        let mut recipients = Vec::new();

        for (filter_name, filter) in &self.filters {
            if message.matches_filter(filter) {
                if let Some(subscribers) = self.subscribers.get(filter_name) {
                    recipients.extend(subscribers.clone());
                }
            }
        }

        recipients.sort();
        recipients.dedup();
        recipients
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_creation() {
        let msg = EnhancedMessage::new_chat(
            "user1".to_string(),
            "user2".to_string(),
            "Hello".to_string(),
            ContentType::Text,
        );

        assert_eq!(msg.get_priority(), MessagePriority::Normal);
        assert_eq!(msg.get_category(), MessageCategory::Chat);
    }

    #[test]
    fn test_message_filter() {
        let msg = EnhancedMessage::new_system(
            "Test".to_string(),
            SystemMessageType::UserAction,
            MessagePriority::High,
        );

        let filter = MessageFilter {
            categories: vec![MessageCategory::System],
            priorities: vec![MessagePriority::High],
            user_types: vec![],
            tags: vec![],
            time_range: None,
        };

        assert!(msg.matches_filter(&filter));
    }
} 