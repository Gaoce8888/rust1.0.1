use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{Duration, Instant};
use warp::{Filter, Reply};
use warp::http::StatusCode;
use tracing::{error, info, debug};

use crate::load_balancer::{LoadBalancer, LoadBalancerStats};
use crate::websocket_pool::{WebSocketConnectionPool, WebSocketPoolStats};

/// API响应结构
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: u64,
    pub error_code: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            message: "Success".to_string(),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            error_code: None,
        }
    }

    pub fn error(message: String, error_code: Option<String>) -> Self {
        Self {
            success: false,
            data: None,
            message,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            error_code,
        }
    }
}

/// 连接请求
#[derive(Debug, Deserialize)]
pub struct ConnectionRequest {
    pub user_id: String,
    pub user_name: String,
    pub user_type: String,
    pub session_id: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
}

/// 连接响应
#[derive(Debug, Serialize)]
pub struct ConnectionResponse {
    pub connection_id: String,
    pub websocket_url: String,
    pub http_fallback_url: String,
    pub session_token: String,
    pub expires_at: u64,
    pub server_info: ServerInfo,
}

/// 服务器信息
#[derive(Debug, Serialize)]
pub struct ServerInfo {
    pub server_id: String,
    pub version: String,
    pub capabilities: Vec<String>,
    pub max_message_size: usize,
    pub heartbeat_interval: u64,
}

/// 消息发送请求
#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub recipient_id: String,
    pub message_type: String,
    pub content: String,
    pub metadata: Option<HashMap<String, String>>,
}

/// 消息发送响应
#[derive(Debug, Serialize)]
pub struct SendMessageResponse {
    pub message_id: String,
    pub status: String,
    pub timestamp: u64,
}

/// 长轮询请求
#[derive(Debug, Deserialize)]
pub struct LongPollingRequest {
    pub session_token: String,
    pub timeout: Option<u64>,
    pub last_message_id: Option<String>,
}

/// 长轮询响应
#[derive(Debug, Serialize)]
pub struct LongPollingResponse {
    pub messages: Vec<MessageData>,
    pub next_timeout: u64,
    pub has_more: bool,
}

/// 消息数据
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageData {
    pub message_id: String,
    pub sender_id: String,
    pub recipient_id: String,
    pub message_type: String,
    pub content: String,
    pub timestamp: u64,
    pub metadata: Option<HashMap<String, String>>,
}

/// 会话状态
#[derive(Debug, Clone)]
pub struct SessionState {
    pub session_id: String,
    pub user_id: String,
    pub user_type: String,
    pub connection_type: ConnectionType,
    pub created_at: Instant,
    pub last_activity: Instant,
    pub pending_messages: Vec<MessageData>,
    pub message_queue: tokio::sync::mpsc::UnboundedSender<MessageData>,
}

/// 连接类型
#[derive(Debug, Clone)]
pub enum ConnectionType {
    WebSocket,
    LongPolling,
    ServerSentEvents,
}

/// API路由管理器
pub struct ApiRoutes {
    sessions: Arc<RwLock<HashMap<String, SessionState>>>,
    load_balancer: Arc<LoadBalancer>,
    websocket_pool: Arc<WebSocketConnectionPool>,
}

impl ApiRoutes {
    pub fn new(
        load_balancer: Arc<LoadBalancer>,
        websocket_pool: Arc<WebSocketConnectionPool>,
    ) -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            load_balancer,
            websocket_pool,
        }
    }

    /// 创建所有API路由
    pub fn create_routes(
        &self,
    ) -> impl Filter<Extract = impl Reply, Error = warp::Rejection> + Clone {
        let api_routes = self.clone();

        // 健康检查路由
        let health = warp::path("health")
            .and(warp::get())
            .and_then(move || {
                let api_routes = api_routes.clone();
                async move { api_routes.health_check().await }
            });

        // 系统状态路由
        let system_status = warp::path("system")
            .and(warp::path("status"))
            .and(warp::get())
            .and_then(move || {
                let api_routes = api_routes.clone();
                async move { api_routes.system_status().await }
            });

        // 连接管理路由
        let connect = warp::path("connect")
            .and(warp::post())
            .and(warp::body::json())
            .and_then(move |req: ConnectionRequest| {
                let api_routes = api_routes.clone();
                async move { api_routes.create_connection(req).await }
            });

        // 断开连接路由
        let disconnect = warp::path("disconnect")
            .and(warp::post())
            .and(warp::path::param::<String>())
            .and_then(move |session_id: String| {
                let api_routes = api_routes.clone();
                async move { api_routes.disconnect(session_id).await }
            });

        // 消息发送路由
        let send_message = warp::path("messages")
            .and(warp::post())
            .and(warp::header::<String>("session-token"))
            .and(warp::body::json())
            .and_then(move |session_token: String, req: SendMessageRequest| {
                let api_routes = api_routes.clone();
                async move { api_routes.send_message(session_token, req).await }
            });

        // 长轮询路由
        let long_polling = warp::path("polling")
            .and(warp::get())
            .and(warp::query::<LongPollingRequest>())
            .and_then(move |req: LongPollingRequest| {
                let api_routes = api_routes.clone();
                async move { api_routes.long_polling(req).await }
            });

        // 服务器发送事件路由
        let sse = warp::path("events")
            .and(warp::get())
            .and(warp::query::<String>())
            .and_then(move |session_token: String| {
                let api_routes = api_routes.clone();
                async move { api_routes.server_sent_events(session_token).await }
            });

        // 统计信息路由
        let stats = warp::path("stats")
            .and(warp::get())
            .and_then(move || {
                let api_routes = api_routes.clone();
                async move { api_routes.get_stats().await }
            });

        // 组合所有路由
        warp::path("api")
            .and(
                health
                    .or(system_status)
                    .or(connect)
                    .or(disconnect)
                    .or(send_message)
                    .or(long_polling)
                    .or(sse)
                    .or(stats)
            )
            .with(warp::cors().allow_any_origin())
            .with(warp::log("api"))
    }

    /// 健康检查
    async fn health_check(&self) -> Result<impl Reply, warp::Rejection> {
        let response = ApiResponse::success(HashMap::from([
            ("status".to_string(), "healthy".to_string()),
            ("timestamp".to_string(), chrono::Utc::now().to_rfc3339()),
            ("version".to_string(), env!("CARGO_PKG_VERSION").to_string()),
        ]));
        
        Ok(warp::reply::json(&response))
    }

    /// 系统状态
    async fn system_status(&self) -> Result<impl Reply, warp::Rejection> {
        let pool_stats = self.websocket_pool.get_stats().await;
        let lb_stats = self.load_balancer.get_server_stats().await
            .map_err(|e| {
                error!("Failed to get load balancer stats: {}", e);
                warp::reject::custom(ApiError::InternalError)
            })?;

        let system_info = HashMap::from([
            ("websocket_connections".to_string(), pool_stats.total_connections.to_string()),
            ("active_connections".to_string(), pool_stats.active_connections.to_string()),
            ("total_messages".to_string(), pool_stats.total_messages.to_string()),
            ("server_count".to_string(), lb_stats.total_servers.to_string()),
            ("healthy_servers".to_string(), lb_stats.healthy_servers.to_string()),
            ("load_balancer_strategy".to_string(), format!("{:?}", lb_stats.strategy)),
        ]);

        let response = ApiResponse::success(system_info);
        Ok(warp::reply::json(&response))
    }

    /// 创建连接
    async fn create_connection(&self, req: ConnectionRequest) -> Result<impl Reply, warp::Rejection> {
        let session_id = uuid::Uuid::new_v4().to_string();
        let session_token = format!("token_{}", session_id);
        
        // 创建消息队列
        let (message_sender, message_receiver) = tokio::sync::mpsc::unbounded_channel();
        
        // 创建会话状态
        let session = SessionState {
            session_id: session_id.clone(),
            user_id: req.user_id.clone(),
            user_type: req.user_type.clone(),
            connection_type: ConnectionType::WebSocket,
            created_at: Instant::now(),
            last_activity: Instant::now(),
            pending_messages: Vec::new(),
            message_queue: message_sender,
        };

        // 存储会话
        self.sessions.write().await.insert(session_token.clone(), session);

        let response = ConnectionResponse {
            connection_id: session_id,
            websocket_url: "ws://localhost:6006/ws".to_string(),
            http_fallback_url: "http://localhost:6006/api/polling".to_string(),
            session_token,
            expires_at: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp_millis() as u64,
            server_info: ServerInfo {
                server_id: "server-1".to_string(),
                version: env!("CARGO_PKG_VERSION").to_string(),
                capabilities: vec![
                    "websocket".to_string(),
                    "long_polling".to_string(),
                    "server_sent_events".to_string(),
                    "file_upload".to_string(),
                    "compression".to_string(),
                ],
                max_message_size: 1024 * 1024,
                heartbeat_interval: 30000,
            },
        };

        info!("Created connection for user: {} with session: {}", req.user_id, session_token);
        
        let api_response = ApiResponse::success(response);
        Ok(warp::reply::json(&api_response))
    }

    /// 断开连接
    async fn disconnect(&self, session_id: String) -> Result<impl Reply, warp::Rejection> {
        let mut sessions = self.sessions.write().await;
        if sessions.remove(&session_id).is_some() {
            info!("Disconnected session: {}", session_id);
            let response = ApiResponse::success(HashMap::from([
                ("status".to_string(), "disconnected".to_string()),
                ("session_id".to_string(), session_id),
            ]));
            Ok(warp::reply::json(&response))
        } else {
            let response = ApiResponse::<()>::error(
                "Session not found".to_string(),
                Some("SESSION_NOT_FOUND".to_string()),
            );
            Ok(warp::reply::with_status(
                warp::reply::json(&response),
                StatusCode::NOT_FOUND,
            ))
        }
    }

    /// 发送消息
    async fn send_message(
        &self,
        session_token: String,
        req: SendMessageRequest,
    ) -> Result<impl Reply, warp::Rejection> {
        let sessions = self.sessions.read().await;
        
        if let Some(session) = sessions.get(&session_token) {
            let message_id = uuid::Uuid::new_v4().to_string();
            
            let message = MessageData {
                message_id: message_id.clone(),
                sender_id: session.user_id.clone(),
                recipient_id: req.recipient_id,
                message_type: req.message_type,
                content: req.content,
                timestamp: chrono::Utc::now().timestamp_millis() as u64,
                metadata: req.metadata,
            };

            // 发送到WebSocket池
            if let Err(e) = self.websocket_pool.send_to_user(
                &message.recipient_id,
                tokio_tungstenite::tungstenite::Message::Text(
                    serde_json::to_string(&message).unwrap_or_default()
                ),
            ).await {
                error!("Failed to send message via WebSocket: {}", e);
            }

            let response = SendMessageResponse {
                message_id,
                status: "sent".to_string(),
                timestamp: chrono::Utc::now().timestamp_millis() as u64,
            };

            let api_response = ApiResponse::success(response);
            Ok(warp::reply::json(&api_response))
        } else {
            let response = ApiResponse::<()>::error(
                "Invalid session token".to_string(),
                Some("INVALID_SESSION".to_string()),
            );
            Ok(warp::reply::with_status(
                warp::reply::json(&response),
                StatusCode::UNAUTHORIZED,
            ))
        }
    }

    /// 长轮询
    async fn long_polling(&self, req: LongPollingRequest) -> Result<impl Reply, warp::Rejection> {
        let timeout = Duration::from_secs(req.timeout.unwrap_or(30));
        let start_time = Instant::now();

        loop {
            // 检查是否有新消息
            let messages = self.get_pending_messages(&req.session_token, &req.last_message_id).await;
            
            if !messages.is_empty() || start_time.elapsed() >= timeout {
                let response = LongPollingResponse {
                    messages,
                    next_timeout: 30,
                    has_more: false,
                };
                
                let api_response = ApiResponse::success(response);
                return Ok(warp::reply::json(&api_response));
            }

            // 等待一小段时间后再次检查
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    }

    /// 获取待处理消息
    async fn get_pending_messages(
        &self,
        session_token: &str,
        last_message_id: &Option<String>,
    ) -> Vec<MessageData> {
        let mut sessions = self.sessions.write().await;
        
        if let Some(session) = sessions.get_mut(session_token) {
            session.last_activity = Instant::now();
            
            // 这里应该实现消息过滤逻辑
            let messages = session.pending_messages.clone();
            session.pending_messages.clear();
            
            messages
        } else {
            Vec::new()
        }
    }

    /// 服务器发送事件
    async fn server_sent_events(&self, session_token: String) -> Result<impl Reply, warp::Rejection> {
        let sessions = self.sessions.read().await;
        
        if sessions.get(&session_token).is_none() {
            let response = ApiResponse::<()>::error(
                "Invalid session token".to_string(),
                Some("INVALID_SESSION".to_string()),
            );
            return Ok(warp::reply::with_status(
                warp::reply::json(&response),
                StatusCode::UNAUTHORIZED,
            ));
        }

        // 创建SSE流
        let event_stream = async_stream::stream! {
            let mut interval = tokio::time::interval(Duration::from_secs(1));
            
            loop {
                interval.tick().await;
                
                // 这里应该从消息队列中获取消息
                let event = format!("data: {}\n\n", 
                    serde_json::to_string(&HashMap::from([
                        ("type".to_string(), "heartbeat".to_string()),
                        ("timestamp".to_string(), chrono::Utc::now().to_rfc3339()),
                    ])).unwrap_or_default()
                );
                
                yield Ok::<_, warp::Error>(event);
            }
        };

        Ok(warp::reply::Response::new(
            warp::hyper::Body::wrap_stream(event_stream),
        ))
    }

    /// 获取统计信息
    async fn get_stats(&self) -> Result<impl Reply, warp::Rejection> {
        let pool_stats = self.websocket_pool.get_stats().await;
        let lb_stats = self.load_balancer.get_server_stats().await
            .map_err(|e| {
                error!("Failed to get load balancer stats: {}", e);
                warp::reject::custom(ApiError::InternalError)
            })?;

        let stats = HashMap::from([
            ("websocket_pool".to_string(), serde_json::to_value(pool_stats).unwrap()),
            ("load_balancer".to_string(), serde_json::to_value(lb_stats).unwrap()),
            ("sessions".to_string(), serde_json::to_value(self.sessions.read().await.len()).unwrap()),
        ]);

        let response = ApiResponse::success(stats);
        Ok(warp::reply::json(&response))
    }
}

impl Clone for ApiRoutes {
    fn clone(&self) -> Self {
        Self {
            sessions: self.sessions.clone(),
            load_balancer: self.load_balancer.clone(),
            websocket_pool: self.websocket_pool.clone(),
        }
    }
}

/// API错误类型
#[derive(Debug)]
pub enum ApiError {
    InternalError,
    InvalidSession,
    MessageTooLarge,
    RateLimited,
}

impl warp::reject::Reject for ApiError {}

/// 错误处理器
pub async fn handle_rejection(err: warp::Rejection) -> Result<impl Reply, std::convert::Infallible> {
    let (code, message, error_code) = if err.is_not_found() {
        (StatusCode::NOT_FOUND, "Not Found".to_string(), Some("NOT_FOUND".to_string()))
    } else if let Some(ApiError::InternalError) = err.find() {
        (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error".to_string(), Some("INTERNAL_ERROR".to_string()))
    } else if let Some(ApiError::InvalidSession) = err.find() {
        (StatusCode::UNAUTHORIZED, "Invalid Session".to_string(), Some("INVALID_SESSION".to_string()))
    } else if let Some(ApiError::MessageTooLarge) = err.find() {
        (StatusCode::PAYLOAD_TOO_LARGE, "Message Too Large".to_string(), Some("MESSAGE_TOO_LARGE".to_string()))
    } else if let Some(ApiError::RateLimited) = err.find() {
        (StatusCode::TOO_MANY_REQUESTS, "Rate Limited".to_string(), Some("RATE_LIMITED".to_string()))
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error".to_string(), Some("UNKNOWN_ERROR".to_string()))
    };

    let response = ApiResponse::<()>::error(message, error_code);
    Ok(warp::reply::with_status(warp::reply::json(&response), code))
}