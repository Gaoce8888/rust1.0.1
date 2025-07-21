//! 前端兼容性数据结构定义
//! 
//! 统一前后端数据结构，确保API接口的一致性

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// 用户角色枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Customer,
    Support,
    Admin,
}

/// 用户状态枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UserStatus {
    Online,
    Offline,
    Away,
    Busy,
}

/// 消息类型枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MessageType {
    Text,
    File,
    Voice,
    Image,
}

/// 消息状态枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MessageStatus {
    Sending,
    Sent,
    Read,
    Error,
}

/// 前端兼容的用户数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrontendUser {
    /// 用户ID
    pub id: String,
    /// 用户名
    pub name: String,
    /// 用户角色
    pub role: UserRole,
    /// 头像URL
    pub avatar: Option<String>,
    /// 用户状态
    pub status: UserStatus,
    /// 显示名称
    pub display_name: Option<String>,
    /// 权限列表
    pub permissions: Option<Vec<String>>,
}

/// 前端兼容的消息数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrontendMessage {
    /// 消息ID
    pub id: String,
    /// 发送者ID
    pub sender_id: String,
    /// 接收者ID
    pub receiver_id: String,
    /// 消息内容
    pub text: String,
    /// 消息类型
    pub message_type: MessageType,
    /// 消息时间
    pub time: DateTime<Utc>,
    /// 消息状态
    pub status: MessageStatus,
    /// 文件URL（如果是文件消息）
    pub file_url: Option<String>,
    /// 文件名（如果是文件消息）
    pub file_name: Option<String>,
}

/// 前端兼容的聊天会话数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrontendChatSession {
    /// 会话ID
    pub id: String,
    /// 参与者列表
    pub participants: Vec<FrontendUser>,
    /// 最后一条消息
    pub last_message: Option<FrontendMessage>,
    /// 未读消息数量
    pub unread_count: u32,
}

/// 前端兼容的登录请求结构
#[derive(Debug, Serialize, Deserialize)]
pub struct FrontendLoginRequest {
    /// 用户名
    pub username: String,
    /// 密码
    pub password: String,
    /// 角色（可选）
    pub role: Option<String>,
}

/// 前端兼容的登录响应结构
#[derive(Debug, Serialize, Deserialize)]
pub struct FrontendLoginResponse {
    /// 是否成功
    pub success: bool,
    /// 响应消息
    pub message: String,
    /// 会话ID
    pub session_id: Option<String>,
    /// 用户信息
    pub user: Option<FrontendUser>,
}

/// 前端兼容的文件上传响应结构
#[derive(Debug, Serialize, Deserialize)]
pub struct FrontendFileUploadResponse {
    /// 文件ID
    pub file_id: String,
    /// 文件名
    pub filename: String,
    /// 文件大小
    pub size: u64,
    /// 上传时间
    pub upload_time: DateTime<Utc>,
    /// 访问URL
    pub access_url: String,
}

/// 前端兼容的用户状态更新请求
#[derive(Debug, Serialize, Deserialize)]
pub struct FrontendUserStatusRequest {
    /// 用户状态
    pub status: UserStatus,
}

/// 前端兼容的用户状态更新响应
#[derive(Debug, Serialize, Deserialize)]
pub struct FrontendUserStatusResponse {
    /// 用户ID
    pub user_id: String,
    /// 更新后的状态
    pub status: UserStatus,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
}

/// 前端兼容的消息历史响应
#[derive(Debug, Serialize, Deserialize)]
pub struct FrontendMessageHistoryResponse {
    /// 消息列表
    pub messages: Vec<FrontendMessage>,
    /// 总数量
    pub total: u32,
    /// 用户ID
    pub user_id: String,
}

/// 前端兼容的消息列表响应
#[derive(Debug, Serialize, Deserialize)]
pub struct FrontendMessageListResponse {
    /// 会话列表
    pub conversations: Vec<FrontendChatSession>,
    /// 总数量
    pub total: u32,
}

/// 前端兼容的用户信息响应
#[derive(Debug, Serialize, Deserialize)]
pub struct FrontendUserInfoResponse {
    /// 用户ID
    pub id: String,
    /// 用户名
    pub username: String,
    /// 显示名称
    pub display_name: String,
    /// 角色
    pub role: String,
    /// 头像URL
    pub avatar: Option<String>,
    /// 状态
    pub status: String,
    /// 权限列表
    pub permissions: Vec<String>,
    /// 最后登录时间
    pub last_login: Option<DateTime<Utc>>,
}

/// 转换后端用户结构到前端结构
impl From<crate::user_manager::User> for FrontendUser {
    fn from(user: crate::user_manager::User) -> Self {
        FrontendUser {
            id: user.id,
            name: user.username,
            role: match user.role.as_str() {
                "customer" => UserRole::Customer,
                "support" | "kefu" => UserRole::Support,
                "admin" => UserRole::Admin,
                _ => UserRole::Customer,
            },
            avatar: None,
            status: match user.status.as_str() {
                "active" => UserStatus::Online,
                "inactive" => UserStatus::Offline,
                _ => UserStatus::Offline,
            },
            display_name: Some(user.display_name),
            permissions: Some(user.permissions),
        }
    }
}

/// 转换后端消息结构到前端结构
impl From<crate::message::ChatMessage> for FrontendMessage {
    fn from(message: crate::message::ChatMessage) -> Self {
        FrontendMessage {
            id: message.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
            sender_id: message.from,
            receiver_id: message.to.unwrap_or_default(),
            text: message.content,
            message_type: match message.content_type {
                Some(crate::message::ContentType::Text) => MessageType::Text,
                Some(crate::message::ContentType::File) => MessageType::File,
                Some(crate::message::ContentType::Voice) => MessageType::Voice,
                Some(crate::message::ContentType::Image) => MessageType::Image,
                _ => MessageType::Text,
            },
            time: message.timestamp,
            status: MessageStatus::Sent, // 默认状态
            file_url: message.url,
            file_name: message.filename,
        }
    }
}

/// 转换前端登录请求到后端结构
impl From<FrontendLoginRequest> for crate::user_manager::LoginRequest {
    fn from(req: FrontendLoginRequest) -> Self {
        crate::user_manager::LoginRequest {
            username: req.username,
            password: req.password,
            role: req.role,
        }
    }
}

/// 转换后端登录响应到前端结构
impl From<crate::user_manager::LoginResponse> for FrontendLoginResponse {
    fn from(resp: crate::user_manager::LoginResponse) -> Self {
        FrontendLoginResponse {
            success: resp.success,
            message: resp.message,
            session_id: resp.session_id,
            user: resp.user.map(|u| FrontendUser {
                id: u.id,
                name: u.username,
                role: match u.role.as_str() {
                    "customer" => UserRole::Customer,
                    "support" | "kefu" => UserRole::Support,
                    "admin" => UserRole::Admin,
                    _ => UserRole::Customer,
                },
                avatar: None,
                status: UserStatus::Online,
                display_name: Some(u.display_name),
                permissions: Some(u.permissions),
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_role_serialization() {
        let role = UserRole::Support;
        let json = serde_json::to_string(&role).unwrap();
        assert_eq!(json, "\"support\"");
        
        let deserialized: UserRole = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, UserRole::Support);
    }

    #[test]
    fn test_message_status_serialization() {
        let status = MessageStatus::Read;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"read\"");
        
        let deserialized: MessageStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, MessageStatus::Read);
    }

    #[test]
    fn test_frontend_user_serialization() {
        let user = FrontendUser {
            id: "user_001".to_string(),
            name: "test_user".to_string(),
            role: UserRole::Customer,
            avatar: Some("https://example.com/avatar.jpg".to_string()),
            status: UserStatus::Online,
            display_name: Some("Test User".to_string()),
            permissions: Some(vec!["chat".to_string()]),
        };
        
        let json = serde_json::to_string(&user).unwrap();
        let deserialized: FrontendUser = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.id, user.id);
        assert_eq!(deserialized.role, user.role);
        assert_eq!(deserialized.status, user.status);
    }
}