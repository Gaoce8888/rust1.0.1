use std::sync::Arc;
use warp::Filter;
use serde::{Deserialize, Serialize};
use crate::auth::kefu_auth::KefuAuthManager;

/// 客服登录请求
#[derive(Debug, Deserialize)]
pub struct KefuLoginRequest {
    pub username: String,
    pub password: String,
}

/// 客服登录响应
#[derive(Debug, Serialize)]
pub struct KefuLoginResponse {
    pub success: bool,
    pub message: String,
    pub kefu_id: Option<String>,
    pub real_name: Option<String>,
    pub max_customers: Option<u32>,
    pub session_token: Option<String>,
}

/// 客服状态响应
#[derive(Debug, Serialize)]
pub struct KefuStatusResponse {
    pub kefu_id: String,
    pub real_name: String,
    pub is_online: bool,
    pub current_customers: u32,
    pub max_customers: u32,
    pub login_time: String,
}

/// 构建客服认证路由
pub fn build_kefu_auth_routes(
    kefu_auth_manager: Arc<KefuAuthManager>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    let login_route = warp::path("api")
        .and(warp::path("kefu"))
        .and(warp::path("login"))
        .and(warp::post())
        .and(warp::body::json())
        .and(with_kefu_auth_manager(kefu_auth_manager.clone()))
        .and_then(handle_kefu_login);

    let logout_route = warp::path("api")
        .and(warp::path("kefu"))
        .and(warp::path("logout"))
        .and(warp::post())
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(with_kefu_auth_manager(kefu_auth_manager.clone()))
        .and_then(handle_kefu_logout);

    let status_route = warp::path("api")
        .and(warp::path("kefu"))
        .and(warp::path("status"))
        .and(warp::get())
        .and(with_kefu_auth_manager(kefu_auth_manager.clone()))
        .and_then(handle_kefu_status);

    let heartbeat_route = warp::path("api")
        .and(warp::path("kefu"))
        .and(warp::path("heartbeat"))
        .and(warp::post())
        .and(warp::query::<std::collections::HashMap<String, String>>())
        .and(with_kefu_auth_manager(kefu_auth_manager.clone()))
        .and_then(handle_kefu_heartbeat);

    // 客服分配路由
    let assign_kefu_route = warp::path("api")
        .and(warp::path("kefu"))
        .and(warp::path("assign"))
        .and(warp::path::param::<String>())
        .and(warp::post())
        .and(with_kefu_auth_manager(kefu_auth_manager.clone()))
        .and_then(handle_assign_kefu);

    let release_kefu_route = warp::path("api")
        .and(warp::path("kefu"))
        .and(warp::path("release"))
        .and(warp::path::param::<String>())
        .and(warp::post())
        .and(with_kefu_auth_manager(kefu_auth_manager.clone()))
        .and_then(handle_release_kefu);

    let get_customer_kefu_route = warp::path("api")
        .and(warp::path("kefu"))
        .and(warp::path("customer"))
        .and(warp::path::param::<String>())
        .and(warp::get())
        .and(with_kefu_auth_manager(kefu_auth_manager.clone()))
        .and_then(handle_get_customer_kefu);

    let cleanup_expired_route = warp::path("api")
        .and(warp::path("kefu"))
        .and(warp::path("cleanup"))
        .and(warp::post())
        .and(with_kefu_auth_manager(kefu_auth_manager.clone()))
        .and_then(handle_cleanup_expired);

    let get_online_customers_route = warp::path("api")
        .and(warp::path("kefu"))
        .and(warp::path("online-customers"))
        .and(warp::get())
        .and(with_kefu_auth_manager(kefu_auth_manager.clone()))
        .and_then(handle_get_online_customers);

    login_route
        .or(logout_route)
        .or(status_route)
        .or(heartbeat_route)
        .or(assign_kefu_route)
        .or(release_kefu_route)
        .or(get_customer_kefu_route)
        .or(cleanup_expired_route)
        .or(get_online_customers_route)
}

/// 客服认证管理器注入
fn with_kefu_auth_manager(
    kefu_auth_manager: Arc<KefuAuthManager>,
) -> impl Filter<Extract = (Arc<KefuAuthManager>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || kefu_auth_manager.clone())
}

/// 处理客服登录
async fn handle_kefu_login(
    request: KefuLoginRequest,
    kefu_auth_manager: Arc<KefuAuthManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    tracing::info!("🔐 客服登录请求: {}", request.username);

    match kefu_auth_manager.authenticate_kefu(&request.username, &request.password).await {
        Ok(Some(kefu_auth)) => {
            // 检查是否已经在线
            match kefu_auth_manager.is_kefu_online(&kefu_auth.kefu_id).await {
                Ok(true) => {
                    let response = KefuLoginResponse {
                        success: false,
                        message: "该客服账号已在线，请先下线其他会话".to_string(),
                        kefu_id: None,
                        real_name: None,
                        max_customers: None,
                        session_token: None,
                    };
                    Ok(warp::reply::json(&response))
                }
                Ok(false) => {
                    // 生成会话token
                    let session_token = format!("kefu_session_{}_{}", kefu_auth.kefu_id, chrono::Utc::now().timestamp());
                    
                    // 客服上线
                    match kefu_auth_manager.kefu_login(&kefu_auth, &session_token).await {
                        Ok(true) => {
                            let response = KefuLoginResponse {
                                success: true,
                                message: "登录成功".to_string(),
                                kefu_id: Some(kefu_auth.kefu_id.clone()),
                                real_name: Some(kefu_auth.real_name.clone()),
                                max_customers: Some(kefu_auth.max_customers),
                                session_token: Some(session_token),
                            };
                            Ok(warp::reply::json(&response))
                        }
                        Ok(false) => {
                            let response = KefuLoginResponse {
                                success: false,
                                message: "登录失败，请重试".to_string(),
                                kefu_id: None,
                                real_name: None,
                                max_customers: None,
                                session_token: None,
                            };
                            Ok(warp::reply::json(&response))
                        }
                        Err(e) => {
                            tracing::error!("客服登录失败: {}", e);
                            let response = KefuLoginResponse {
                                success: false,
                                message: "系统错误，请联系管理员".to_string(),
                                kefu_id: None,
                                real_name: None,
                                max_customers: None,
                                session_token: None,
                            };
                            Ok(warp::reply::json(&response))
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("检查客服在线状态失败: {}", e);
                    let response = KefuLoginResponse {
                        success: false,
                        message: "系统错误，请联系管理员".to_string(),
                        kefu_id: None,
                        real_name: None,
                        max_customers: None,
                        session_token: None,
                    };
                    Ok(warp::reply::json(&response))
                }
            }
        }
        Ok(None) => {
            let response = KefuLoginResponse {
                success: false,
                message: "用户名或密码错误".to_string(),
                kefu_id: None,
                real_name: None,
                max_customers: None,
                session_token: None,
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            tracing::error!("客服认证失败: {}", e);
            let response = KefuLoginResponse {
                success: false,
                message: "系统错误，请联系管理员".to_string(),
                kefu_id: None,
                real_name: None,
                max_customers: None,
                session_token: None,
            };
            Ok(warp::reply::json(&response))
        }
    }
}

/// 处理客服下线
async fn handle_kefu_logout(
    query: std::collections::HashMap<String, String>,
    kefu_auth_manager: Arc<KefuAuthManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let kefu_id = query.get("kefu_id").unwrap_or(&"".to_string()).clone();
    
    if kefu_id.is_empty() {
        return Ok(warp::reply::json(&serde_json::json!({
            "success": false,
            "message": "缺少客服ID参数"
        })));
    }

    match kefu_auth_manager.kefu_logout(&kefu_id).await {
        Ok(()) => {
            Ok(warp::reply::json(&serde_json::json!({
                "success": true,
                "message": "下线成功"
            })))
        }
        Err(e) => {
            tracing::error!("客服下线失败: {}", e);
            Ok(warp::reply::json(&serde_json::json!({
                "success": false,
                "message": "下线失败"
            })))
        }
    }
}

/// 处理客服状态查询
async fn handle_kefu_status(
    kefu_auth_manager: Arc<KefuAuthManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match kefu_auth_manager.get_online_kefu_list().await {
        Ok(online_kefu) => {
            let status_list: Vec<KefuStatusResponse> = online_kefu
                .into_iter()
                .map(|kefu| KefuStatusResponse {
                    kefu_id: kefu.kefu_id,
                    real_name: kefu.real_name,
                    is_online: kefu.is_online,
                    current_customers: kefu.current_customers,
                    max_customers: kefu.max_customers,
                    login_time: kefu.login_time.format("%Y-%m-%d %H:%M:%S").to_string(),
                })
                .collect();

            Ok(warp::reply::json(&serde_json::json!({
                "success": true,
                "data": status_list
            })))
        }
        Err(e) => {
            tracing::error!("获取客服状态失败: {}", e);
            Ok(warp::reply::json(&serde_json::json!({
                "success": false,
                "message": "获取状态失败"
            })))
        }
    }
}

/// 处理客服心跳
async fn handle_kefu_heartbeat(
    query: std::collections::HashMap<String, String>,
    kefu_auth_manager: Arc<KefuAuthManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let kefu_id = query.get("kefu_id").unwrap_or(&"".to_string()).clone();
    
    if kefu_id.is_empty() {
        return Ok(warp::reply::json(&serde_json::json!({
            "success": false,
            "message": "缺少客服ID参数"
        })));
    }

    match kefu_auth_manager.update_kefu_heartbeat(&kefu_id).await {
        Ok(()) => {
            Ok(warp::reply::json(&serde_json::json!({
                "success": true,
                "message": "心跳更新成功"
            })))
        }
        Err(e) => {
            tracing::error!("客服心跳更新失败: {}", e);
            Ok(warp::reply::json(&serde_json::json!({
                "success": false,
                "message": "心跳更新失败"
            })))
        }
    }
}

/// 处理客服分配
async fn handle_assign_kefu(
    customer_id: String,
    kefu_auth_manager: Arc<KefuAuthManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match kefu_auth_manager.assign_kefu_for_customer(&customer_id).await {
        Ok(Some(kefu_id)) => {
            Ok(warp::reply::json(&serde_json::json!({
                "success": true,
                "kefu_id": kefu_id,
                "message": format!("已为客户 {} 分配客服", customer_id)
            })))
        }
        Ok(None) => {
            Ok(warp::reply::json(&serde_json::json!({
                "success": false,
                "message": "暂无可用客服"
            })))
        }
        Err(e) => {
            tracing::error!("客服分配失败: {}", e);
            Ok(warp::reply::json(&serde_json::json!({
                "success": false,
                "message": format!("分配失败: {}", e)
            })))
        }
    }
}

/// 处理释放客服
async fn handle_release_kefu(
    customer_id: String,
    kefu_auth_manager: Arc<KefuAuthManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match kefu_auth_manager.release_kefu_for_customer(&customer_id).await {
        Ok(()) => {
            Ok(warp::reply::json(&serde_json::json!({
                "success": true,
                "message": format!("已释放客户 {} 的客服", customer_id)
            })))
        }
        Err(e) => {
            tracing::error!("释放客服失败: {}", e);
            Ok(warp::reply::json(&serde_json::json!({
                "success": false,
                "message": format!("释放失败: {}", e)
            })))
        }
    }
}

/// 获取客户的客服
async fn handle_get_customer_kefu(
    customer_id: String,
    kefu_auth_manager: Arc<KefuAuthManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match kefu_auth_manager.get_kefu_for_customer(&customer_id).await {
        Ok(Some(kefu_id)) => {
            Ok(warp::reply::json(&serde_json::json!({
                "success": true,
                "kefu_id": kefu_id,
                "customer_id": customer_id
            })))
        }
        Ok(None) => {
            Ok(warp::reply::json(&serde_json::json!({
                "success": false,
                "message": "该客户未分配客服"
            })))
        }
        Err(e) => {
            tracing::error!("获取客服失败: {}", e);
            Ok(warp::reply::json(&serde_json::json!({
                "success": false,
                "message": format!("获取失败: {}", e)
            })))
        }
    }
}

/// 清理过期客服
async fn handle_cleanup_expired(
    kefu_auth_manager: Arc<KefuAuthManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match kefu_auth_manager.cleanup_expired_kefu().await {
        Ok(()) => {
            Ok(warp::reply::json(&serde_json::json!({
                "success": true,
                "message": "过期客服清理完成"
            })))
        }
        Err(e) => {
            tracing::error!("清理过期客服失败: {}", e);
            Ok(warp::reply::json(&serde_json::json!({
                "success": false,
                "message": format!("清理过期客服失败: {}", e)
            })))
        }
    }
}

/// 在线客户信息
#[derive(Debug, Serialize)]
pub struct OnlineCustomer {
    pub customer_id: String,
    pub name: String,
    pub assigned_kefu: Option<String>,
    pub online_time: String,
    pub last_message_time: Option<String>,
}

/// 获取在线客户列表
async fn handle_get_online_customers(
    kefu_auth_manager: Arc<KefuAuthManager>,
) -> Result<impl warp::Reply, warp::Rejection> {
    tracing::info!("📋 获取在线客户列表请求");

    // 这里需要从WebSocket连接管理器获取在线客户
    // 暂时返回模拟数据，实际应该从连接管理器获取
    let online_customers = vec![
        OnlineCustomer {
            customer_id: "customer001".to_string(),
            name: "张三".to_string(),
            assigned_kefu: Some("kefu001".to_string()),
            online_time: chrono::Utc::now().to_rfc3339(),
            last_message_time: Some(chrono::Utc::now().to_rfc3339()),
        },
        OnlineCustomer {
            customer_id: "customer002".to_string(),
            name: "李四".to_string(),
            assigned_kefu: None,
            online_time: chrono::Utc::now().to_rfc3339(),
            last_message_time: None,
        },
    ];

    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "data": online_customers,
        "total": online_customers.len()
    })))
}