use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(tag = "type")]
pub enum Message {
    // 聊天消息
    #[serde(rename = "Chat")]
    Chat {
        id: Option<String>,
        from: String,
        to: Option<String>,
        content: String,
        content_type: Option<ContentType>,
        filename: Option<String>,
        timestamp: DateTime<Utc>,
        url: Option<String>,
    },
    // 系统消息
    #[serde(rename = "System")]
    System {
        content: String,
        timestamp: DateTime<Utc>,
    },
    // 打字指示器
    #[serde(rename = "Typing")]
    Typing {
        from: String,
        to: Option<String>,
        is_typing: bool,
        timestamp: DateTime<Utc>,
    },
    // 心跳检测
    #[serde(rename = "Heartbeat")]
    Heartbeat {
        user_id: Option<String>,
        timestamp: DateTime<Utc>,
    },
    // 历史消息
    #[serde(rename = "History")]
    History { messages: Vec<ChatMessage> },
    // 历史消息请求
    #[serde(rename = "HistoryRequest")]
    HistoryRequest {
        customer_id: String,
        limit: Option<usize>,
        timestamp: DateTime<Utc>,
    },
    // 在线用户列表（可以是请求或响应）
    #[serde(rename = "OnlineUsers")]
    OnlineUsers {
        #[serde(skip_serializing_if = "Option::is_none")]
        users: Option<Vec<UserInfo>>,
    },
    // 用户加入
    #[serde(rename = "UserJoined")]
    UserJoined {
        user_id: String,
        user_name: String,
        user_type: UserType,
        zhanghao: Option<String>,
        timestamp: DateTime<Utc>,
    },
    // 用户离开
    #[serde(rename = "UserLeft")]
    UserLeft {
        user_id: String,
        user_name: String,
        user_type: UserType,
        timestamp: DateTime<Utc>,
    },
    // 状态更新
    #[serde(rename = "Status")]
    Status {
        user_id: String,
        status: OnlineStatus,
        timestamp: DateTime<Utc>,
    },
    // 欢迎消息
    #[serde(rename = "Welcome")]
    Welcome {
        user_id: String,
        user_name: String,
        user_type: UserType,
        zhanghao: Option<String>,
        timestamp: DateTime<Utc>,
    },
    // 错误消息
    #[serde(rename = "Error")]
    Error {
        message: String,
        code: i32,
        timestamp: DateTime<Utc>,
    },
    // HTML模板消息
    #[serde(rename = "HtmlTemplate")]
    HtmlTemplate {
        id: Option<String>,
        template_id: String,
        template_name: String,
        from: String,
        to: Option<String>,
        variables: std::collections::HashMap<String, serde_json::Value>,
        rendered_html: Option<String>,
        callback_url: Option<String>,
        callback_data: Option<serde_json::Value>,
        timestamp: DateTime<Utc>,
    },
    // HTML模板回调
    #[serde(rename = "HtmlCallback")]
    HtmlCallback {
        message_id: String,
        template_id: String,
        action: String, // click, view, close, etc.
        element_id: Option<String>,
        callback_data: serde_json::Value,
        user_id: String,
        timestamp: DateTime<Utc>,
    },
    // 语音消息
    #[serde(rename = "VoiceMessage")]
    Voice {
        id: Option<String>,
        from: String,
        to: Option<String>,
        voice_id: String,
        file_id: String,
        original_filename: String,
        file_size: u64,
        duration: Option<u32>, // 语音时长（秒）
        format: String, // mp3, wav, m4a, ogg 等
        access_url: String,
        transcription: Option<String>, // 语音转文字（可选）
        timestamp: DateTime<Utc>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
pub enum UserType {
    Kefu, // 客服
    Kehu, // 客户
}

impl std::fmt::Display for UserType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserType::Kefu => write!(f, "kefu"),
            UserType::Kehu => write!(f, "kehu"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
pub enum ContentType {
    Text,
    Image,
    File,
    Voice,
    Video,
    Html, // HTML模板消息
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
pub enum OnlineStatus {
    Online,
    Offline,
    Away,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ChatMessage {
    pub id: Option<String>,
    pub from: String,
    pub to: Option<String>,
    pub content: String,
    pub content_type: Option<ContentType>,
    pub filename: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UserInfo {
    pub user_id: String,
    pub user_name: String,
    pub user_type: UserType,
    pub status: OnlineStatus,
    pub zhanghao: Option<String>,
    pub last_seen: DateTime<Utc>,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Session {
    pub session_id: String,
    pub kefu_id: String,
    pub kehu_id: String,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub messages: Vec<ChatMessage>,
    pub kehu_zhanghao: Option<String>,
}

// 🚀 企业级客户信息结构
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CustomerInfo {
    pub id: String,
    pub name: String,
    pub status: OnlineStatus,
    pub last_message: String,
    pub last_activity: DateTime<Utc>,
    pub unread_count: u32,
}

// 连接配置
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConnectionConfig {
    pub kefu_id: Option<String>,
    pub user_name: String,
    pub zhanghao: Option<String>,
    pub user_type: UserType,
}

// 用户连接信息 - 企业级功能保留
#[derive(Debug, Clone)]
#[allow(dead_code)] // 企业级字段保留：user_id, zhanghao用于未来扩展功能
pub struct UserConnection {
    pub user_id: String,
    pub user_name: String,
    pub user_type: UserType,
    pub zhanghao: Option<String>,
    pub connected_at: DateTime<Utc>,
    pub last_heartbeat: DateTime<Utc>,
    pub status: OnlineStatus,
}
