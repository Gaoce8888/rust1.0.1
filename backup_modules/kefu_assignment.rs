use std::sync::Arc;
use warp::{Reply, Rejection};
use serde::{Deserialize, Serialize};
use crate::websocket::WebSocketManager;
use crate::types::api::ApiResponse;
use crate::message::{UserType};
use chrono::{DateTime, Utc};

// 请求和响应结构体
#[derive(Debug, Serialize, Deserialize)]
pub struct AssignCustomerRequest {
    pub kefu_id: Option<String>, // 可选，如果不指定则自动分配
    pub priority: Option<String>, // high, normal, low
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KefuWorkloadInfo {
    pub kefu_id: String,
    pub kefu_name: String,
    pub active_sessions: usize,
    pub max_sessions: usize,
    pub utilization_rate: f64,
    pub status: String, // available, busy, offline
    pub avg_response_time: f64,
    pub satisfaction_score: f64,
    pub last_activity: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AvailableKefuInfo {
    pub kefu_id: String,
    pub kefu_name: String,
    pub current_load: usize,
    pub max_capacity: usize,
    pub efficiency_score: f64,
    pub last_activity: DateTime<Utc>,
}

// 获取客服的客户列表
pub async fn handle_get_kefu_customers(
    kefu_id: String,
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl Reply, Rejection> {
    match ws_manager.get_kefu_customers(&kefu_id).await {
        Ok(customers) => {
            let response = ApiResponse {
                success: true,
                message: "获取客服客户列表成功".to_string(),
                data: Some(serde_json::json!({
                    "kefu_id": kefu_id,
                    "customers": customers,
                    "total": customers.len()
                })),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            tracing::error!("获取客服客户列表失败: {:?}", e);
            Err(warp::reject::custom(crate::types::api::ApiError::new(
                format!("获取客服客户列表失败: {}", e),
                Some(500)
            )))
        }
    }
}

// 获取客服工作负载信息
pub async fn handle_get_kefu_workload(
    kefu_id: String,
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl Reply, Rejection> {
    let connections = ws_manager.connections.read().await;
    let redis = ws_manager.redis.read().await;
    
    // 获取客服连接信息
    let kefu_conn = match connections.get(&kefu_id) {
        Some(conn) => conn,
        None => {
            return Err(warp::reject::custom(crate::types::api::ApiError::new(
                "客服不在线".to_string(),
                Some(404)
            )));
        }
    };
    
    // 获取工作负载信息
    match redis.get_kefu_workload(&kefu_id).await {
        Ok(workload_data) => {
            let active_sessions = workload_data["active_sessions"].as_u64().unwrap_or(0) as usize;
            let max_sessions = workload_data["max_sessions"].as_u64().unwrap_or(5) as usize;
            let utilization_rate = workload_data["utilization_rate"].as_f64().unwrap_or(0.0);
            let status = workload_data["status"].as_str().unwrap_or("unknown").to_string();
            
            let workload_info = KefuWorkloadInfo {
                kefu_id: kefu_id.clone(),
                kefu_name: kefu_conn.user_name.clone(),
                active_sessions,
                max_sessions,
                utilization_rate,
                status,
                avg_response_time: 30.0, // TODO: 计算实际平均响应时间
                satisfaction_score: 5.0, // TODO: 计算实际满意度评分
                last_activity: kefu_conn.last_heartbeat,
            };
            
            let response = ApiResponse {
                success: true,
                message: "获取客服工作负载成功".to_string(),
                data: Some(serde_json::json!({
                    "workload": workload_info,
                    "raw_data": workload_data
                })),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            tracing::error!("获取客服工作负载失败: {:?}", e);
            Err(warp::reject::custom(crate::types::api::ApiError::new(
                format!("获取客服工作负载失败: {}", e),
                Some(500)
            )))
        }
    }
}

// 客服切换客户
pub async fn handle_switch_customer(
    kefu_id: String,
    customer_id: String,
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl Reply, Rejection> {
    match ws_manager.switch_customer_session(&kefu_id, &customer_id).await {
        Ok(success) => {
            if success {
                let response = ApiResponse {
                    success: true,
                    message: format!("客服 {} 已成功切换到客户 {}", kefu_id, customer_id),
                    data: Some(serde_json::json!({
                        "kefu_id": kefu_id,
                        "customer_id": customer_id,
                        "switch_time": Utc::now(),
                        "status": "success"
                    })),
                };
                Ok(warp::reply::json(&response))
            } else {
                Err(warp::reject::custom(crate::types::api::ApiError::new(
                    "客服切换客户失败".to_string(),
                    Some(500)
                )))
            }
        }
        Err(e) => {
            tracing::error!("客服切换客户错误: {:?}", e);
            Err(warp::reject::custom(crate::types::api::ApiError::new(
                format!("客服切换客户失败: {}", e),
                Some(500)
            )))
        }
    }
}

// 获取可用客服列表
pub async fn handle_get_available_kefu(
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl Reply, Rejection> {
    let connections = ws_manager.connections.read().await;
    let redis = ws_manager.redis.read().await;
    
    let mut available_kefu = Vec::new();
    
    for (kefu_id, connection) in connections.iter() {
        if connection.user_type == UserType::Kefu {
            // 获取工作负载信息
            if let Ok(workload_data) = redis.get_kefu_workload(kefu_id).await {
                let active_sessions = workload_data["active_sessions"].as_u64().unwrap_or(0) as usize;
                let max_sessions = workload_data["max_sessions"].as_u64().unwrap_or(5) as usize;
                
                // 只包含未满负载的客服
                if active_sessions < max_sessions {
                    let efficiency_score = (10.0 - active_sessions as f64) * 2.0; // 简化的效率评分
                    
                    available_kefu.push(AvailableKefuInfo {
                        kefu_id: kefu_id.clone(),
                        kefu_name: connection.user_name.clone(),
                        current_load: active_sessions,
                        max_capacity: max_sessions,
                        efficiency_score,
                        last_activity: connection.last_heartbeat,
                    });
                }
            }
        }
    }
    
    // 按效率评分排序
    available_kefu.sort_by(|a, b| b.efficiency_score.partial_cmp(&a.efficiency_score).unwrap_or(std::cmp::Ordering::Equal));
    
    let response = ApiResponse {
        success: true,
        message: "获取可用客服列表成功".to_string(),
        data: Some(serde_json::json!({
            "available_kefu": available_kefu,
            "total": available_kefu.len()
        })),
    };
    
    Ok(warp::reply::json(&response))
}

// 获取等待中的客户列表
pub async fn handle_get_waiting_customers(
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl Reply, Rejection> {
    let redis = ws_manager.redis.read().await;
    let connections = ws_manager.connections.read().await;
    
    match redis.get_waiting_queue().await {
        Ok(waiting_customers) => {
            let mut customer_details = Vec::new();
            
            for customer_id in waiting_customers {
                if let Some(customer_conn) = connections.get(&customer_id) {
                    // 获取等待信息
                    let waiting_info = match redis.get_async_connection().await {
                        Ok(mut conn) => {
                            if let Ok(info_json) = conn.get(&format!("waiting:{}", customer_id)).await {
                                serde_json::from_str::<serde_json::Value>(&info_json).unwrap_or_default()
                            } else {
                                serde_json::json!({})
                            }
                        }
                        Err(_) => serde_json::json!({}),
                    };
                    
                    customer_details.push(serde_json::json!({
                        "customer_id": customer_id,
                        "customer_name": customer_conn.user_name,
                        "status": format!("{:?}", customer_conn.status),
                        "waiting_since": waiting_info["waiting_since"],
                        "waiting_duration_seconds": Utc::now().timestamp() - waiting_info["waiting_since"].as_i64().unwrap_or(0)
                    }));
                }
            }
            
            let response = ApiResponse {
                success: true,
                message: "获取等待客户列表成功".to_string(),
                data: Some(serde_json::json!({
                    "waiting_customers": customer_details,
                    "total": customer_details.len()
                })),
            };
            
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            tracing::error!("获取等待客户列表失败: {:?}", e);
            Err(warp::reject::custom(crate::types::api::ApiError::new(
                format!("获取等待客户列表失败: {}", e),
                Some(500)
            )))
        }
    }
}

// 为客户分配客服
pub async fn handle_assign_customer(
    customer_id: String,
    request: AssignCustomerRequest,
    ws_manager: Arc<WebSocketManager>,
) -> Result<impl Reply, Rejection> {
    let connections = ws_manager.connections.read().await;
    
    // 验证客户是否在线
    if !connections.contains_key(&customer_id) {
        return Err(warp::reject::custom(crate::types::api::ApiError::new(
            "客户不在线".to_string(),
            Some(404)
        )));
    }
    
    let assigned_kefu_id = if let Some(kefu_id) = request.kefu_id {
        // 验证指定客服是否在线且可用
        if !connections.contains_key(&kefu_id) {
            return Err(warp::reject::custom(crate::types::api::ApiError::new(
                "指定客服不在线".to_string(),
                Some(404)
            )));
        }
        
        // 检查客服负载
        let redis = ws_manager.redis.read().await;
        if let Ok(workload_data) = redis.get_kefu_workload(&kefu_id).await {
            let active_sessions = workload_data["active_sessions"].as_u64().unwrap_or(0) as usize;
            let max_sessions = workload_data["max_sessions"].as_u64().unwrap_or(5) as usize;
            
            if active_sessions >= max_sessions {
                return Err(warp::reject::custom(crate::types::api::ApiError::new(
                    "指定客服已达到最大负载".to_string(),
                    Some(400)
                )));
            }
        }
        
        kefu_id
    } else {
        // 自动分配最优客服
        match ws_manager.find_optimal_kefu_for_customer(&customer_id).await {
            Ok(kefu_id) => kefu_id,
            Err(e) => {
                tracing::error!("自动分配客服失败: {:?}", e);
                return Err(warp::reject::custom(crate::types::api::ApiError::new(
                    format!("自动分配客服失败: {}", e),
                    Some(500)
                )));
            }
        }
    };
    
    // 建立会话
    match ws_manager.establish_session(&customer_id, &assigned_kefu_id, &None).await {
        Ok(_) => {
            let response = ApiResponse {
                success: true,
                message: format!("客户 {} 已成功分配给客服 {}", customer_id, assigned_kefu_id),
                data: Some(serde_json::json!({
                    "customer_id": customer_id,
                    "assigned_kefu_id": assigned_kefu_id,
                    "assignment_time": Utc::now(),
                    "priority": request.priority,
                    "note": request.note,
                    "status": "assigned"
                })),
            };
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            tracing::error!("建立会话失败: {:?}", e);
            Err(warp::reject::custom(crate::types::api::ApiError::new(
                format!("分配客户失败: {}", e),
                Some(500)
            )))
        }
    }
}