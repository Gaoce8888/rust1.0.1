use crate::types::websocket::WebSocketParams;
use crate::message::UserType;
use crate::errors::log_websocket_param_error;
use crate::auth::jwt_auth::JwtAuthManager;
use std::sync::Arc;

/// WebSocket连接信息
pub struct WebSocketConnectionInfo {
    pub user_id: String,
    pub user_name: String,
    pub user_type: UserType,
    pub zhanghao: Option<String>,
    pub session_token: Option<String>,
    pub jwt_token: Option<String>,
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
    let jwt_token = query.get("jwt_token").cloned();

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
        jwt_token,
    })
}

/// 验证WebSocket连接的认证
pub async fn validate_websocket_auth(
    connection_info: &WebSocketConnectionInfo,
    auth_manager: &Arc<JwtAuthManager>,
) -> Result<bool, String> {
    // 如果有JWT token，优先使用JWT认证
    if let Some(token) = &connection_info.jwt_token {
        match auth_manager.verify_token(token).await {
            Ok(claims) => {
                // 验证用户信息是否匹配
                if claims.sub != connection_info.user_id || 
                   claims.username != connection_info.user_name ||
                   claims.user_type != connection_info.user_type.to_string() {
                    return Err("用户信息不匹配".to_string());
                }
                Ok(true)
            }
            Err(e) => {
                Err(format!("JWT认证失败: {}", e.message))
            }
        }
    } else {
        // 兼容旧版本，简单验证用户是否在线
        if auth_manager.is_user_online(&connection_info.user_id).await {
            Ok(true)
        } else {
            Err("用户不在线".to_string())
        }
    }
} 