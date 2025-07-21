
use std::sync::atomic::AtomicU64;
use warp::reject::Rejection;
use warp::reply::Reply;

use serde::{Deserialize, Serialize};

/// 全局错误计数器 - 用于限制重复错误日志
/// WebSocket参数错误计数器，用于监控和调试
#[allow(dead_code)] // 用于错误统计和监控
static WS_PARAM_ERROR_COUNT: AtomicU64 = AtomicU64::new(0);

/// 无效参数错误
#[derive(Debug, Serialize, Deserialize)]
pub struct InvalidParams {
    pub message: String,
}

impl warp::reject::Reject for InvalidParams {}

/// 统一错误处理函数
/// 
/// 将各种类型的错误转换为统一的JSON响应格式
pub async fn handle_rejection(err: Rejection) -> Result<impl Reply, std::convert::Infallible> {
    let code;
    let message;

    if err.is_not_found() {
        code = warp::http::StatusCode::NOT_FOUND;
        message = "路径不存在";
    } else if err.find::<InvalidParams>().is_some() {
        code = warp::http::StatusCode::BAD_REQUEST;
        message = "参数错误";
    } else if err.find::<warp::reject::MethodNotAllowed>().is_some() {
        code = warp::http::StatusCode::METHOD_NOT_ALLOWED;
        message = "方法不允许";
    } else {
        tracing::error!("未处理的错误: {:?}", err);
        code = warp::http::StatusCode::INTERNAL_SERVER_ERROR;
        message = "内部服务器错误";
    }

    let json = warp::reply::json(&serde_json::json!({
        "success": false,
        "message": message,
        "code": code.as_u16()
    }));

    Ok(warp::reply::with_status(json, code))
}

/// `记录WebSocket参数错误`
/// 
/// `用于记录WebSocket连接过程中的参数解析错误`
pub fn log_websocket_param_error(param_name: &str, error: &str) {
    tracing::warn!("🔗 WebSocket参数错误 - {}: {}", param_name, error);
}

#[cfg(test)]
mod tests {
    use super::*;
    // Warp测试工具 - 仅在测试时使用
    #[allow(unused_imports)]
    use warp::test;
    
    #[test]
    fn test_invalid_params_creation() {
        let error = InvalidParams {
            message: "测试错误消息".to_string(),
        };
        
        assert_eq!(error.message, "测试错误消息");
    }
    
    #[test]
    fn test_log_websocket_param_error() {
        // 这个测试只是验证函数不会panic
        log_websocket_param_error("user_id", "缺少必需参数");
        // 在实际使用中，这会输出日志，但在测试中我们只验证不崩溃
    }
    
    #[tokio::test]
    async fn test_handle_rejection_not_found() {
        use warp::reject;
        
        let rejection = reject::not_found();
        let result = handle_rejection(rejection).await;
        
        assert!(result.is_ok(), "handle_rejection应该总是返回Ok");
    }
    
    #[tokio::test]
    async fn test_handle_rejection_invalid_params() {
        use warp::reject;
        
        let invalid_params = InvalidParams {
            message: "测试无效参数".to_string(),
        };
        let rejection = reject::custom(invalid_params);
        let result = handle_rejection(rejection).await;
        
        assert!(result.is_ok(), "handle_rejection应该能处理InvalidParams错误");
    }
} 