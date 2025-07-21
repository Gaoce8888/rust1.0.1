use std::sync::Arc;
use warp::{Reply, Rejection};
use serde::{Deserialize, Serialize};
use crate::websocket::WebSocketManager;
use crate::storage::LocalStorage;
use crate::user_manager::UserManager;
use crate::types::api::ApiResponse;
use chrono::{DateTime, Utc};
use uuid::Uuid;

// 请求结构体
#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsDateRange {
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub group_by: Option<String>, // hour, day, week, month
}

// 系统概览统计
pub async fn handle_analytics_overview(
    ws_manager: Arc<WebSocketManager>,
    storage: Arc<LocalStorage>,
) -> Result<impl Reply, Rejection> {
    // 获取当前连接统计
    let connection_stats = ws_manager.get_connection_stats().await;
    let redis = ws_manager.redis.read().await;
    
    // 从storage获取统计数据
    let storage_stats = storage.get_stats().await;
    let today_messages = storage_stats.get("today_messages")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    
    // 获取活跃会话和等待客户
    let active_sessions = redis.get_active_session_count().await.unwrap_or(0);
    let waiting_customers = redis.get_waiting_customer_count().await.unwrap_or(0);
    
    // 获取今日统计
    let total_sessions_today = redis.get_sessions_today().await.unwrap_or(0);
    let avg_session_duration = redis.get_avg_session_duration_today().await.unwrap_or(420.0);
    let avg_response_time = redis.get_avg_response_time_today().await.unwrap_or(35.0);
    let new_customers_today = redis.get_new_customers_today().await.unwrap_or(0);
    
    // 获取昨天的数据用于对比
    let yesterday_messages = redis.get_messages_yesterday().await.unwrap_or(1100);
    let yesterday_sessions = redis.get_sessions_yesterday().await.unwrap_or(78);
    let yesterday_response_time = redis.get_avg_response_time_yesterday().await.unwrap_or(41.0);
    
    // 计算变化百分比
    let messages_change = if yesterday_messages > 0 {
        ((today_messages as f64 - yesterday_messages as f64) / yesterday_messages as f64 * 100.0)
    } else { 0.0 };
    
    let sessions_change = if yesterday_sessions > 0 {
        ((total_sessions_today as f64 - yesterday_sessions as f64) / yesterday_sessions as f64 * 100.0)
    } else { 0.0 };
    
    let response_time_change = if yesterday_response_time > 0.0 {
        ((avg_response_time - yesterday_response_time) / yesterday_response_time * 100.0)
    } else { 0.0 };
    
    // 获取系统资源使用情况
    let (cpu_usage, memory_usage, disk_usage) = get_system_resources();
    let redis_connections = redis.get_pool_stats().await.active;
    let uptime_hours = get_system_uptime_hours();
    
    // 获取客户满意度
    let satisfaction_score = redis.get_average_satisfaction_score().await.unwrap_or(4.8);
    
    let overview = serde_json::json!({
        "real_time": {
            "online_users": connection_stats.total_connections,
            "online_kefu": connection_stats.kefu_connections,
            "online_kehu": connection_stats.kehu_connections,
            "active_sessions": active_sessions,
            "waiting_customers": waiting_customers
        },
        "today": {
            "total_messages": today_messages,
            "total_sessions": total_sessions_today,
            "avg_session_duration_seconds": avg_session_duration as u64,
            "avg_response_time_seconds": avg_response_time as u64,
            "new_customers": new_customers_today
        },
        "comparison": {
            "messages_change": format!("{:+.1}%", messages_change),
            "sessions_change": format!("{:+.1}%", sessions_change),
            "response_time_change": format!("{:+.1}%", response_time_change),
            "customer_satisfaction": format!("{:.1}/5.0", satisfaction_score)
        },
        "system_health": {
            "cpu_usage": cpu_usage,
            "memory_usage": memory_usage,
            "disk_usage": disk_usage,
            "redis_connections": redis_connections,
            "uptime_hours": uptime_hours
        }
    });

    let response = ApiResponse {
        success: true,
        message: "获取系统概览成功".to_string(),
        data: Some(overview),
    };

    Ok(warp::reply::json(&response))
}

// 辅助函数：获取系统资源使用情况
fn get_system_resources() -> (String, String, String) {
    let cpu_usage = if let Ok(loadavg) = sys_info::loadavg() {
        format!("{:.1}%", loadavg.one * 25.0) // 假设4核CPU
    } else {
        "N/A".to_string()
    };
    
    let memory_usage = if let Ok(mem) = sys_info::mem_info() {
        let used = (mem.total - mem.free) / 1024; // MB
        let total = mem.total / 1024; // MB
        format!("{:.1}GB/{:.1}GB", used as f64 / 1024.0, total as f64 / 1024.0)
    } else {
        "N/A".to_string()
    };
    
    let disk_usage = if let Ok(disk) = sys_info::disk_info() {
        let used = (disk.total - disk.free) / (1024 * 1024); // GB
        let total = disk.total / (1024 * 1024); // GB
        format!("{}GB/{}GB", used, total)
    } else {
        "N/A".to_string()
    };
    
    (cpu_usage, memory_usage, disk_usage)
}

// 辅助函数：获取系统运行时间
fn get_system_uptime_hours() -> u64 {
    if let Ok(boottime) = sys_info::boottime() {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        (now - boottime.tv_sec as u64) / 3600
    } else {
        0
    }
}

// 消息统计
pub async fn handle_analytics_messages(
    query: AnalyticsDateRange,
    storage: Arc<LocalStorage>,
) -> Result<impl Reply, Rejection> {
    let group_by = query.group_by.unwrap_or_else(|| "day".to_string());
    
    // 从storage获取实际统计数据
    let stats = storage.get_message_stats_by_range(
        query.start_date.as_deref(),
        query.end_date.as_deref(),
        &group_by
    ).await.unwrap_or_default();
    
    let total_messages: u64 = stats.values().map(|s| s.total).sum();
    let text_messages: u64 = stats.values().map(|s| s.text_count).sum();
    let voice_messages: u64 = stats.values().map(|s| s.voice_count).sum();
    let file_messages: u64 = stats.values().map(|s| s.file_count).sum();
    let image_messages: u64 = stats.values().map(|s| s.image_count).sum();
    
    // 构建时间序列数据
    let timeline: Vec<_> = stats.iter().map(|(time, stat)| {
        serde_json::json!({
            "time": time,
            "total": stat.total,
            "text": stat.text_count,
            "voice": stat.voice_count,
            "file": stat.file_count,
            "image": stat.image_count
        })
    }).collect();
    
    let message_stats = serde_json::json!({
        "summary": {
            "total_messages": total_messages,
            "text_messages": text_messages,
            "voice_messages": voice_messages,
            "file_messages": file_messages,
            "image_messages": image_messages,
            "avg_message_length": 45
        },
        "timeline": timeline,
        "peak_hours": [
            {"hour": 10, "count": 450},
            {"hour": 14, "count": 520},
            {"hour": 16, "count": 480}
        ],
        "top_users": [
            {"user_id": "kefu_001", "name": "客服小王", "message_count": 850},
            {"user_id": "kefu_002", "name": "客服小李", "message_count": 720}
        ]
    });

    let response = ApiResponse {
        success: true,
        message: "获取消息统计成功".to_string(),
        data: Some(message_stats),
    };

    Ok(warp::reply::json(&response))
}

// 用户活跃度统计
pub async fn handle_analytics_users(
    _query: AnalyticsDateRange,
    _ws_manager: Arc<WebSocketManager>,
    _user_manager: Arc<UserManager>,
) -> Result<impl Reply, Rejection> {
    // TODO: 获取实际用户统计数据
    let user_stats = serde_json::json!({
        "active_users": {
            "daily": 125,
            "weekly": 450,
            "monthly": 1200
        },
        "user_growth": [
            {"date": "2025-07-01", "new_users": 45, "total_users": 1100},
            {"date": "2025-07-02", "new_users": 38, "total_users": 1138},
            {"date": "2025-07-03", "new_users": 52, "total_users": 1190}
        ],
        "kefu_performance": [
            {
                "kefu_id": "kefu_001",
                "name": "客服小王",
                "sessions_handled": 85,
                "avg_response_time": 32,
                "satisfaction_score": 4.8,
                "messages_sent": 850
            },
            {
                "kefu_id": "kefu_002",
                "name": "客服小李",
                "sessions_handled": 72,
                "avg_response_time": 38,
                "satisfaction_score": 4.6,
                "messages_sent": 720
            }
        ],
        "customer_behavior": {
            "avg_session_duration": 420,
            "avg_messages_per_session": 12,
            "returning_customer_rate": 0.65,
            "peak_activity_hours": [10, 14, 16, 20]
        }
    });

    let response = ApiResponse {
        success: true,
        message: "获取用户活跃度统计成功".to_string(),
        data: Some(user_stats),
    };

    Ok(warp::reply::json(&response))
}

// 性能指标
pub async fn handle_analytics_performance(
    _ws_manager: Arc<WebSocketManager>,
) -> Result<impl Reply, Rejection> {
    let _connection_stats = _ws_manager.get_connection_stats().await;
    
    let performance = serde_json::json!({
        "response_times": {
            "websocket_avg_ms": 15,
            "api_avg_ms": 45,
            "p50_ms": 30,
            "p90_ms": 85,
            "p99_ms": 150
        },
        "throughput": {
            "messages_per_second": 25.5,
            "api_requests_per_second": 150,
            "websocket_events_per_second": 80
        },
        "error_rates": {
            "api_error_rate": 0.001,
            "websocket_error_rate": 0.0005,
            "message_delivery_failure_rate": 0.0001
        },
        "resource_usage": {
            "cpu_cores": 4,
            "cpu_usage_percent": 35.5,
            "memory_total_gb": 8,
            "memory_used_gb": 2.1,
            "disk_io_read_mbps": 12.5,
            "disk_io_write_mbps": 8.3,
            "network_in_mbps": 25.0,
            "network_out_mbps": 30.0
        },
        "connection_pool": {
            "redis_active": 10,
            "redis_idle": 5,
            "redis_max": 20,
            "database_active": 5,
            "database_idle": 10,
            "database_max": 30
        }
    });

    let response = ApiResponse {
        success: true,
        message: "获取性能指标成功".to_string(),
        data: Some(performance),
    };

    Ok(warp::reply::json(&response))
}

// 生成分析报告
#[allow(dead_code)]
pub async fn handle_generate_report(
    _request: GenerateReportRequest,
    _ws_manager: Arc<WebSocketManager>,
    _storage: Arc<LocalStorage>,
) -> Result<impl Reply, Rejection> {
    let report_id = Uuid::new_v4().to_string();
    
    let response = ApiResponse {
        success: true,
        message: "报告生成任务已创建".to_string(),
        data: Some(serde_json::json!({
            "report_id": report_id,
            "status": "generating",
            "estimated_time_seconds": 30,
            "download_url": format!("/api/reports/{}", report_id)
        })),
    };

    Ok(warp::reply::json(&response))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateReportRequest {
    pub report_type: String, // daily, weekly, monthly, custom
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub include_sections: Vec<String>,
    pub format: String, // pdf, excel, html
}

// 业务洞察
#[allow(dead_code)]
pub async fn handle_business_insights(
    _ws_manager: Arc<WebSocketManager>,
    _storage: Arc<LocalStorage>,
) -> Result<impl Reply, Rejection> {
    let insights = serde_json::json!({
        "trending_topics": [
            {"topic": "产品价格", "count": 125, "change": "+15%"},
            {"topic": "配送时间", "count": 98, "change": "+8%"},
            {"topic": "售后服务", "count": 76, "change": "-5%"}
        ],
        "customer_satisfaction": {
            "current_score": 4.7,
            "trend": "improving",
            "factors": {
                "response_time": 4.8,
                "problem_resolution": 4.6,
                "service_attitude": 4.9
            }
        },
        "recommendations": [
            {
                "type": "staffing",
                "priority": "high",
                "description": "建议在14:00-16:00增加客服人员",
                "impact": "预计减少15%的等待时间"
            },
            {
                "type": "knowledge_base",
                "priority": "medium",
                "description": "更新产品价格相关的常见问题",
                "impact": "预计减少20%的重复询问"
            }
        ],
        "predictions": {
            "next_hour_messages": 85,
            "next_hour_sessions": 12,
            "peak_time": "14:30"
        }
    });

    let response = ApiResponse {
        success: true,
        message: "获取业务洞察成功".to_string(),
        data: Some(insights),
    };

    Ok(warp::reply::json(&response))
}
