use std::collections::HashMap;

/// `WebSocket连接参数`
pub type WebSocketParams = HashMap<String, String>;

/// `WebSocket连接验证结果`
#[allow(dead_code)] // 将在WebSocket认证中使用
pub struct WebSocketConnectionInfo {
    pub user_id: String,
    pub user_name: String,
    pub user_type: crate::message::UserType,
    pub zhanghao: Option<String>,
} 