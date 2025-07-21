use crate::types::websocket::WebSocketParams;
use crate::message::UserType;
use crate::errors::log_websocket_param_error;
use crate::auth::kefu_auth::KefuAuthManager;
use std::sync::Arc;

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

/// 验证客服WebSocket连接的认证
pub async fn validate_kefu_websocket_auth(
    connection_info: &WebSocketConnectionInfo,
    kefu_auth_manager: &Arc<KefuAuthManager>,
) -> Result<bool, String> {
    // 只对客服类型进行认证验证
    if let UserType::Kefu = connection_info.user_type {
        // 检查是否提供了session_token
        if let Some(session_token) = &connection_info.session_token {
            // 验证客服是否在线且token有效
            match kefu_auth_manager.is_kefu_online(&connection_info.user_id).await {
                Ok(true) => {
                    // 这里应该验证session_token的有效性
                    // 暂时简化验证，只要有token且客服在线就认为有效
                    if session_token.starts_with("kefu_session_") {
                        return Ok(true);
                    } else {
                        return Err("无效的session_token".to_string());
                    }
                }
                Ok(false) => {
                    return Err("客服未登录或已下线".to_string());
                }
                Err(e) => {
                    return Err(format!("验证客服状态失败: {}", e));
                }
            }
        } else {
            return Err("客服类型连接缺少session_token".to_string());
        }
    }
    
    // 客户类型不需要认证
    Ok(true)
} 