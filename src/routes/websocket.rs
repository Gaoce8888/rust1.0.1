use std::sync::Arc;
use warp::Filter;
use crate::websocket::WebSocketManager;
use crate::types::websocket::WebSocketParams;
use crate::auth::websocket::{parse_websocket_connection, validate_websocket_auth};
use crate::errors::InvalidParams;

/// 构建WebSocket路由
pub fn build_websocket_routes(
    ws_manager: Arc<WebSocketManager>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    
    // WebSocket路由 - 简化版本
    let ws_manager_clone = ws_manager.clone();
    warp::path("ws")
        .and(warp::ws())
        .and(warp::query::<WebSocketParams>())
        .and_then(move |ws: warp::ws::Ws, query: WebSocketParams| {
            let ws_manager = ws_manager_clone.clone();
            async move { handle_websocket(ws, query, ws_manager).await }
        })
}

/// 处理WebSocket连接
async fn handle_websocket(
    ws: warp::ws::Ws,
    query: WebSocketParams,
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    tracing::info!("WebSocket连接请求: {:?}", query);

    // 验证和解析连接参数
    let connection_info = parse_websocket_connection(&query)
        .map_err(|_| warp::reject::custom(InvalidParams { 
            message: "Invalid WebSocket connection parameters".to_string() 
        }))?;

    // 验证连接认证
    match validate_websocket_auth(&connection_info).await {
        Ok(true) => {
            tracing::info!("WebSocket认证通过");
        }
        Ok(false) => {
            tracing::warn!("WebSocket认证失败: 认证不通过");
            return Err(warp::reject::custom(InvalidParams { 
                message: "Authentication failed".to_string() 
            }));
        }
        Err(e) => {
            tracing::error!("WebSocket认证失败: {}", e);
            return Err(warp::reject::custom(InvalidParams { 
                message: format!("Authentication error: {}", e) 
            }));
        }
    }

    Ok(ws.on_upgrade(move |socket| async move {
        tracing::info!(
            "WebSocket连接建立: 用户ID={}, 用户名={}, 类型={:?}",
            connection_info.user_id, connection_info.user_name, connection_info.user_type
        );

        let result = ws_manager
            .handle_connection(
                socket,
                connection_info.user_id,
                connection_info.user_name,
                connection_info.user_type,
                connection_info.zhanghao,
                None,
            )
            .await;

        if let Err(e) = result {
            tracing::error!("WebSocket连接处理失败: {:?}", e);
        }
    }))
} 