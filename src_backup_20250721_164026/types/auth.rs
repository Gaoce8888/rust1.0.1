use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use crate::message::UserType;

/// 用户信息提取器
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AppUserInfo {
    /// 用户ID
    pub id: String,
    /// 用户名
    pub name: String,
    /// 用户类型
    pub user_type: UserType,
}

/// 实时用户状态
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct RealtimeUserStatus {
    /// 操作是否成功
    pub success: bool,
    /// 用户名
    pub username: String,
    /// 是否在线
    pub is_online: bool,
    /// 检查时间
    pub check_time: chrono::DateTime<chrono::Utc>,
    /// 检测方法
    pub detection_method: String,
    /// 置信度
    pub confidence: f64,
}

/// 用户在线详细信息
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct UserOnlineInfo {
    /// 操作是否成功
    pub success: bool,
    /// 用户名
    pub username: String,
    /// 会话ID
    pub session_id: String,
    /// 最后活动时间
    pub last_activity: chrono::DateTime<chrono::Utc>,
    /// IP地址
    pub ip_address: String,
    /// 是否真正在线
    pub is_truly_online: bool,
    /// 检查时间
    pub check_time: chrono::DateTime<chrono::Utc>,
}

/// 用户离线信息
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct UserOfflineInfo {
    /// 操作是否成功
    pub success: bool,
    /// 用户名
    pub username: String,
    /// 是否在线
    pub is_online: bool,
    /// 消息
    pub message: String,
    /// 检查时间
    pub check_time: chrono::DateTime<chrono::Utc>,
} 