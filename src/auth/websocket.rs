use crate::types::websocket::WebSocketParams;
use crate::message::UserType;
use crate::errors::log_websocket_param_error;

/// WebSocket连接信息
pub struct WebSocketConnectionInfo {
    pub user_id: String,
    pub user_name: String,
    pub user_type: UserType,
    pub zhanghao: Option<String>,
    pub session_token: Option<String>,
}

/// 验证WebSocket连接参数 - 修复版本
pub fn validate_websocket_params(query: &WebSocketParams) -> bool {
    // 简化验证：只要求必要的两个参数
    let has_user_id = query.contains_key("user_id");
    let has_user_type = query.contains_key("user_type");
    
    if !has_user_id {
        log_websocket_param_error("user_id", "缺少必需的user_id参数");
        return false;
    }
    
    if !has_user_type {
        log_websocket_param_error("user_type", "缺少必需的user_type参数");
        return false;
    }
    
    true
}

/// 解析WebSocket连接参数
pub fn parse_websocket_connection(query: &WebSocketParams) -> Result<WebSocketConnectionInfo, String> {
    if !validate_websocket_params(query) {
        log_websocket_param_error("query", "Missing required WebSocket parameters");
        return Err("WebSocket参数验证失败：缺少必要参数".to_string());
    }

    // 获取必需参数
    let user_id = query.get("user_id").cloned().unwrap();
    let user_type_str = query.get("user_type").cloned().unwrap();
    
    // 使用user_id作为用户名，或从可选参数中获取
    let user_name = query
        .get("user_name")
        .cloned()
        .unwrap_or_else(|| user_id.clone());
    
    let zhanghao = query.get("zhanghao").cloned();
    let session_token = query.get("session_token").cloned();

    // 解析用户类型 - 兼容多种类型名称
    let user_type = match user_type_str.to_lowercase().as_str() {
        "kefu" | "support" | "agent" => UserType::Kefu,
        "kehu" | "customer" | "client" => UserType::Kehu,
        _ => {
            log_websocket_param_error("user_type", &format!("未知的用户类型: {}", user_type_str));
            return Err(format!("未知的用户类型: {}", user_type_str));
        }
    };

    Ok(WebSocketConnectionInfo {
        user_id,
        user_name,
        user_type,
        zhanghao,
        session_token,
    })
}

/// 验证WebSocket连接的认证 - 简化版本
pub async fn validate_websocket_auth(
    connection_info: &WebSocketConnectionInfo,
) -> Result<bool, String> {
    // 简化认证：所有用户类型都允许连接
    // 可以根据需要添加更严格的认证逻辑
    Ok(true)
} 