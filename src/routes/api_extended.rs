use std::sync::Arc;
use warp::Filter;
use crate::websocket::WebSocketManager;
use crate::user_manager::UserManager;
use crate::storage::LocalStorage;
use crate::file_manager::FileManager;

// 导入系统扩展处理器

/// 构建扩展的API路由 - 补充缺失的功能
pub fn build_extended_api_routes(
    ws_manager: Arc<WebSocketManager>,
    user_manager: Arc<UserManager>,
    storage: Arc<LocalStorage>,
    _file_manager: Arc<FileManager>,
) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    
    // === 用户管理 API ===
    let users_list = warp::path!("api" / "users")
        .and(warp::get())
        .and(warp::query::<crate::handlers::users::UserListQuery>())
        .and(with_user_manager(user_manager.clone()))
        .and_then(|query, user_manager| {
            crate::handlers::users::handle_list_users(user_manager, query)
        });

    let users_create = warp::path!("api" / "users" / "create")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::users::handle_create_user);

    let users_get = warp::path!("api" / "users" / String)
        .and(warp::get())
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::users::handle_get_user);

    let users_update = warp::path!("api" / "users" / String)
        .and(warp::put())
        .and(warp::body::json())
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::users::handle_update_user);

    let users_delete = warp::path!("api" / "users" / String)
        .and(warp::delete())
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::users::handle_delete_user);

    let users_permissions = warp::path!("api" / "users" / String / "permissions")
        .and(warp::put())
        .and(warp::body::json())
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::users::handle_update_permissions);

    let users_status = warp::path!("api" / "users" / String / "status")
        .and(warp::put())
        .and(warp::body::json())
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::users::handle_update_user_status);

    // === 消息管理 API ===
    let messages_list = warp::path!("api" / "messages")
        .and(warp::get())
        .and(warp::query())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::messages::handle_list_messages);

    let messages_get = warp::path!("api" / "messages" / String)
        .and(warp::get())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::messages::handle_get_message);

    let messages_search = warp::path!("api" / "messages" / "search")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::messages::handle_search_messages);

    let messages_export = warp::path!("api" / "messages" / "export")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::messages::handle_export_messages);

    let messages_delete = warp::path!("api" / "messages" / String)
        .and(warp::delete())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::messages::handle_delete_message);

    // === 会话管理 API ===
    let sessions_list = warp::path!("api" / "sessions" / "list")
        .and(warp::get())
        .and(warp::query())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::sessions::handle_list_sessions);

    let sessions_get = warp::path!("api" / "sessions" / String)
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::sessions::handle_get_session);

    let sessions_messages = warp::path!("api" / "sessions" / String / "messages")
        .and(warp::get())
        .and(warp::query())
        .and(with_ws_manager(ws_manager.clone()))
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::sessions::handle_get_session_messages);

    let sessions_transfer = warp::path!("api" / "sessions" / String / "transfer")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::sessions::handle_transfer_session);

    let sessions_end = warp::path!("api" / "sessions" / String / "end")
        .and(warp::post())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::sessions::handle_end_session);

    let sessions_statistics = warp::path!("api" / "sessions" / String / "statistics")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::sessions::handle_session_statistics);

    // === 客服分配管理 API ===
    let kefu_customers = warp::path!("api" / "kefu" / String / "customers")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::kefu_assignment::handle_get_kefu_customers);

    let kefu_workload = warp::path!("api" / "kefu" / String / "workload")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::kefu_assignment::handle_get_kefu_workload);

    let kefu_switch_customer = warp::path!("api" / "kefu" / String / "switch" / String)
        .and(warp::post())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(|kefu_id: String, customer_id: String, ws_manager| {
            crate::handlers::kefu_assignment::handle_switch_customer(kefu_id, customer_id, ws_manager)
        });

    let kefu_available = warp::path!("api" / "kefu" / "available")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::kefu_assignment::handle_get_available_kefu);

    let kefu_waiting_customers = warp::path!("api" / "kefu" / "waiting")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::kefu_assignment::handle_get_waiting_customers);

    let customer_assign = warp::path!("api" / "customer" / String / "assign")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(|customer_id: String, request, ws_manager| {
            crate::handlers::kefu_assignment::handle_assign_customer(customer_id, request, ws_manager)
        });

    // === 统计分析 API ===
    let analytics_overview = warp::path!("api" / "analytics" / "overview")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::analytics::handle_analytics_overview);

    let analytics_messages = warp::path!("api" / "analytics" / "messages")
        .and(warp::get())
        .and(warp::query())
        .and(with_storage(storage.clone()))
        .and_then(crate::handlers::analytics::handle_analytics_messages);

    let analytics_users = warp::path!("api" / "analytics" / "users")
        .and(warp::get())
        .and(warp::query())
        .and(with_ws_manager(ws_manager.clone()))
        .and(with_user_manager(user_manager.clone()))
        .and_then(crate::handlers::analytics::handle_analytics_users);

    let analytics_performance = warp::path!("api" / "analytics" / "performance")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(crate::handlers::analytics::handle_analytics_performance);

    // === 系统管理 API ===
    let system_logs = warp::path!("api" / "system" / "logs")
        .and(warp::get())
        .and(warp::query())
        .and_then(handle_system_logs);

    let system_backup = warp::path!("api" / "system" / "backup")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_storage(storage.clone()))
        .and_then(handle_system_backup);

    let system_maintenance = warp::path!("api" / "system" / "maintenance")
        .and(warp::put())
        .and(warp::body::json())
        .and_then(handle_system_maintenance);

    let system_health = warp::path!("api" / "system" / "health")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and(with_storage(storage.clone()))
        .and_then(handle_system_health);

    // === Redis管理 API ===
    let redis_status = warp::path!("api" / "redis" / "status")
        .and(warp::get())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(handle_redis_status);

    let redis_flush = warp::path!("api" / "redis" / "flush")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(handle_redis_flush);

    let redis_keys = warp::path!("api" / "redis" / "keys")
        .and(warp::get())
        .and(warp::query())
        .and(with_ws_manager(ws_manager.clone()))
        .and_then(|query: std::collections::HashMap<String, String>, ws_manager| {
            let pattern = query.get("pattern").cloned();
            handle_redis_keys(pattern, ws_manager)
        });

    // 组合所有路由
    users_list
        .or(users_create)
        .or(users_get)
        .or(users_update)
        .or(users_delete)
        .or(users_permissions)
        .or(users_status)
        .or(messages_list)
        .or(messages_get)
        .or(messages_search)
        .or(messages_export)
        .or(messages_delete)
        .or(sessions_list)
        .or(sessions_get)
        .or(sessions_messages)
        .or(sessions_transfer)
        .or(sessions_end)
        .or(sessions_statistics)
        .or(kefu_customers)
        .or(kefu_workload)
        .or(kefu_switch_customer)
        .or(kefu_available)
        .or(kefu_waiting_customers)
        .or(customer_assign)
        .or(analytics_overview)
        .or(analytics_messages)
        .or(analytics_users)
        .or(analytics_performance)
        .or(system_logs)
        .or(system_backup)
        .or(system_maintenance)
        .or(system_health)
        .or(redis_status)
        .or(redis_flush)
        .or(redis_keys)
}

// Helper functions
fn with_ws_manager(ws_manager: Arc<WebSocketManager>) -> impl Filter<Extract = (Arc<WebSocketManager>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || ws_manager.clone())
}

fn with_user_manager(user_manager: Arc<UserManager>) -> impl Filter<Extract = (Arc<UserManager>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || user_manager.clone())
}

fn with_storage(storage: Arc<LocalStorage>) -> impl Filter<Extract = (Arc<LocalStorage>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || storage.clone())
}

// 系统管理处理器
async fn handle_system_logs(request: serde_json::Value) -> Result<impl warp::Reply, warp::Rejection> {
    let level = request.get("level").and_then(|v| v.as_str()).unwrap_or("info");
    let limit = request.get("limit").and_then(|v| v.as_u64()).unwrap_or(100) as usize;
    let start_time = request.get("start_time").and_then(|v| v.as_str());
    let end_time = request.get("end_time").and_then(|v| v.as_str());
    
    // 读取日志文件
    let log_dir = std::env::var("LOG_DIR").unwrap_or_else(|_| "logs".to_string());
    let log_file = format!("{}/app.log", log_dir);
    
    let mut logs = Vec::new();
    
    if let Ok(content) = tokio::fs::read_to_string(&log_file).await {
        let lines: Vec<&str> = content.lines().collect();
        let total_lines = lines.len();
        let start_index = if total_lines > limit { total_lines - limit } else { 0 };
        
        for line in &lines[start_index..] {
            // 解析日志行
            if let Ok(log_entry) = serde_json::from_str::<serde_json::Value>(line) {
                // 过滤日志级别
                if let Some(log_level) = log_entry.get("level").and_then(|v| v.as_str()) {
                    if should_include_log_level(log_level, level) {
                        // 过滤时间范围
                        if let Some(timestamp) = log_entry.get("timestamp").and_then(|v| v.as_str()) {
                            if is_within_time_range(timestamp, start_time, end_time) {
                                logs.push(log_entry);
                            }
                        }
                    }
                }
            } else {
                // 处理非JSON格式的日志
                logs.push(serde_json::json!({
                    "timestamp": chrono::Utc::now().to_rfc3339(),
                    "level": "info",
                    "message": line
                }));
            }
        }
    }

    Ok(warp::reply::json(&serde_json::json!({
        "logs": logs,
        "total": logs.len()
    })))
}

fn should_include_log_level(log_level: &str, filter_level: &str) -> bool {
    let levels = ["trace", "debug", "info", "warn", "error"];
    let log_idx = levels.iter().position(|&l| l == log_level).unwrap_or(2);
    let filter_idx = levels.iter().position(|&l| l == filter_level).unwrap_or(2);
    log_idx >= filter_idx
}

fn is_within_time_range(timestamp: &str, start_time: Option<&str>, end_time: Option<&str>) -> bool {
    if let Ok(log_time) = chrono::DateTime::parse_from_rfc3339(timestamp) {
        if let Some(start) = start_time {
            if let Ok(start_dt) = chrono::DateTime::parse_from_rfc3339(start) {
                if log_time < start_dt {
                    return false;
                }
            }
        }
        if let Some(end) = end_time {
            if let Ok(end_dt) = chrono::DateTime::parse_from_rfc3339(end) {
                if log_time > end_dt {
                    return false;
                }
            }
        }
        true
    } else {
        true
    }
}

async fn handle_system_backup(request: serde_json::Value, storage: Arc<LocalStorage>) -> Result<impl warp::Reply, warp::Rejection> {
    let backup_type = request.get("type").and_then(|v| v.as_str()).unwrap_or("full");
    let include_messages = request.get("include_messages").and_then(|v| v.as_bool()).unwrap_or(true);
    let include_users = request.get("include_users").and_then(|v| v.as_bool()).unwrap_or(true);
    let include_config = request.get("include_config").and_then(|v| v.as_bool()).unwrap_or(true);
    
    // 创建备份目录
    let backup_dir = format!("backups/{}", chrono::Utc::now().format("%Y%m%d_%H%M%S"));
    tokio::fs::create_dir_all(&backup_dir).await.map_err(|e| {
        tracing::error!("创建备份目录失败: {}", e);
        warp::reject::custom(crate::error::ApiError::InternalError)
    })?;
    
    let mut backup_files = Vec::new();
    
    // 备份消息数据
    if include_messages {
        let messages_file = format!("{}/messages.json", backup_dir);
        if let Ok(messages) = storage.get_all_messages().await {
            let content = serde_json::to_string_pretty(&messages).unwrap_or_default();
            if tokio::fs::write(&messages_file, content).await.is_ok() {
                backup_files.push("messages.json");
            }
        }
    }
    
    // 备份用户数据
    if include_users {
        let users_file = format!("{}/users.json", backup_dir);
        if let Ok(content) = tokio::fs::read_to_string("config/users.json").await {
            if tokio::fs::write(&users_file, content).await.is_ok() {
                backup_files.push("users.json");
            }
        }
    }
    
    // 备份配置文件
    if include_config {
        let config_files = vec![
            ("config/address_config.toml", "address_config.toml"),
            ("config/redis_pool.toml", "redis_pool.toml"),
            ("config/message_system.toml", "message_system.toml"),
            ("config/ai_config.toml", "ai_config.toml"),
        ];
        
        for (src, dst) in config_files {
            let dst_file = format!("{}/{}", backup_dir, dst);
            if let Ok(content) = tokio::fs::read_to_string(src).await {
                if tokio::fs::write(&dst_file, content).await.is_ok() {
                    backup_files.push(dst);
                }
            }
        }
    }
    
    // 创建备份元数据
    let metadata = serde_json::json!({
        "backup_time": chrono::Utc::now().to_rfc3339(),
        "backup_type": backup_type,
        "files": backup_files,
        "version": env!("CARGO_PKG_VERSION"),
    });
    
    let metadata_file = format!("{}/metadata.json", backup_dir);
    tokio::fs::write(&metadata_file, serde_json::to_string_pretty(&metadata).unwrap()).await.ok();
    
    // 创建压缩包
    let archive_path = format!("{}.tar.gz", backup_dir);
    let output = tokio::process::Command::new("tar")
        .args(&["-czf", &archive_path, &backup_dir])
        .output()
        .await;
    
    // 清理临时目录
    tokio::fs::remove_dir_all(&backup_dir).await.ok();
    
    if output.is_ok() {
        Ok(warp::reply::json(&serde_json::json!({
            "success": true,
            "message": "系统备份成功",
            "backup_file": archive_path,
            "backup_size": tokio::fs::metadata(&archive_path).await.ok().map(|m| m.len()).unwrap_or(0),
            "backed_up_files": backup_files
        })))
    } else {
        Err(warp::reject::custom(crate::error::ApiError::InternalError))
    }
}

async fn handle_system_maintenance(request: serde_json::Value) -> Result<impl warp::Reply, warp::Rejection> {
    let enabled = request.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
    let message = request.get("message").and_then(|v| v.as_str()).unwrap_or("系统维护中，请稍后访问");
    let estimated_duration = request.get("estimated_duration").and_then(|v| v.as_u64()).unwrap_or(3600);
    
    // 维护模式状态文件
    let maintenance_file = "maintenance.json";
    
    if enabled {
        // 启用维护模式
        let maintenance_info = serde_json::json!({
            "enabled": true,
            "message": message,
            "started_at": chrono::Utc::now().to_rfc3339(),
            "estimated_end": (chrono::Utc::now() + chrono::Duration::seconds(estimated_duration as i64)).to_rfc3339(),
        });
        
        tokio::fs::write(maintenance_file, serde_json::to_string_pretty(&maintenance_info).unwrap())
            .await
            .map_err(|e| {
                tracing::error!("写入维护模式文件失败: {}", e);
                warp::reject::custom(crate::error::ApiError::InternalError)
            })?;
            
        // 广播维护通知
        if let Ok(ws_manager) = crate::websocket::WS_MANAGER.get() {
            let _ = ws_manager.broadcast_system_message(&serde_json::json!({
                "type": "maintenance",
                "enabled": true,
                "message": message,
                "estimated_duration": estimated_duration
            })).await;
        }
        
        Ok(warp::reply::json(&serde_json::json!({
            "success": true,
            "message": "已启用维护模式",
            "maintenance_info": maintenance_info
        })))
    } else {
        // 关闭维护模式
        tokio::fs::remove_file(maintenance_file).await.ok();
        
        // 广播恢复通知
        if let Ok(ws_manager) = crate::websocket::WS_MANAGER.get() {
            let _ = ws_manager.broadcast_system_message(&serde_json::json!({
                "type": "maintenance",
                "enabled": false,
                "message": "系统已恢复正常"
            })).await;
        }
        
        Ok(warp::reply::json(&serde_json::json!({
            "success": true,
            "message": "已关闭维护模式"
        })))
    }
}

async fn handle_system_health(ws_manager: Arc<WebSocketManager>, storage: Arc<LocalStorage>) -> Result<impl warp::Reply, warp::Rejection> {
    let mut health_status = serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "checks": {}
    });
    
    let mut overall_healthy = true;
    let checks = health_status["checks"].as_object_mut().unwrap();
    
    // 检查WebSocket连接
    {
        let connections = ws_manager.connections.read().await;
        let active_connections = connections.len();
        let ws_healthy = active_connections < 10000; // 假设最大支持10000连接
        
        checks.insert("websocket".to_string(), serde_json::json!({
            "status": if ws_healthy { "healthy" } else { "warning" },
            "active_connections": active_connections,
            "max_connections": 10000
        }));
        
        if !ws_healthy {
            overall_healthy = false;
        }
    }
    
    // 检查Redis连接
    {
        let redis = ws_manager.redis.read().await;
        let redis_healthy = redis.ping().await.is_ok();
        
        checks.insert("redis".to_string(), serde_json::json!({
            "status": if redis_healthy { "healthy" } else { "unhealthy" },
            "connected": redis_healthy
        }));
        
        if !redis_healthy {
            overall_healthy = false;
        }
    }
    
    // 检查存储
    {
        let storage_stats = storage.get_stats().await;
        let message_count = storage_stats.get("total_messages").and_then(|v| v.as_u64()).unwrap_or(0);
        let storage_healthy = message_count < 1000000; // 假设最大100万条消息
        
        checks.insert("storage".to_string(), serde_json::json!({
            "status": if storage_healthy { "healthy" } else { "warning" },
            "total_messages": message_count,
            "max_messages": 1000000
        }));
        
        if !storage_healthy {
            overall_healthy = false;
        }
    }
    
    // 检查内存使用
    {
        if let Ok(mem_info) = sys_info::mem_info() {
            let used_memory = mem_info.total - mem_info.free;
            let memory_usage_percent = (used_memory as f64 / mem_info.total as f64) * 100.0;
            let memory_healthy = memory_usage_percent < 90.0;
            
            checks.insert("memory".to_string(), serde_json::json!({
                "status": if memory_healthy { "healthy" } else { "warning" },
                "total_mb": mem_info.total / 1024,
                "used_mb": used_memory / 1024,
                "free_mb": mem_info.free / 1024,
                "usage_percent": memory_usage_percent
            }));
            
            if !memory_healthy {
                overall_healthy = false;
            }
        }
    }
    
    // 检查CPU使用
    {
        if let Ok(loadavg) = sys_info::loadavg() {
            let cpu_healthy = loadavg.one < 4.0; // 假设4核CPU
            
            checks.insert("cpu".to_string(), serde_json::json!({
                "status": if cpu_healthy { "healthy" } else { "warning" },
                "load_1min": loadavg.one,
                "load_5min": loadavg.five,
                "load_15min": loadavg.fifteen
            }));
            
            if !cpu_healthy {
                overall_healthy = false;
            }
        }
    }
    
    // 检查磁盘空间
    {
        if let Ok(disk_info) = sys_info::disk_info() {
            let disk_usage_percent = ((disk_info.total - disk_info.free) as f64 / disk_info.total as f64) * 100.0;
            let disk_healthy = disk_usage_percent < 90.0;
            
            checks.insert("disk".to_string(), serde_json::json!({
                "status": if disk_healthy { "healthy" } else { "warning" },
                "total_gb": disk_info.total / (1024 * 1024),
                "free_gb": disk_info.free / (1024 * 1024),
                "usage_percent": disk_usage_percent
            }));
            
            if !disk_healthy {
                overall_healthy = false;
            }
        }
    }
    
    health_status["status"] = serde_json::Value::String(
        if overall_healthy { "healthy" } else { "unhealthy" }.to_string()
    );
    
    Ok(warp::reply::json(&health_status))
}

async fn handle_redis_status(ws_manager: Arc<WebSocketManager>) -> Result<impl warp::Reply, warp::Rejection> {
    let redis = ws_manager.redis.read().await;
    
    // 获取Redis信息
    let info_result = redis.get_info().await;
    let is_connected = redis.ping().await.is_ok();
    
    let mut status_data = serde_json::json!({
        "connected": is_connected,
        "timestamp": chrono::Utc::now().to_rfc3339()
    });
    
    if let Ok(info) = info_result {
        // 解析Redis INFO输出
        let mut server_info = serde_json::Map::new();
        let mut memory_info = serde_json::Map::new();
        let mut stats_info = serde_json::Map::new();
        let mut keyspace_info = serde_json::Map::new();
        
        for line in info.lines() {
            if line.starts_with('#') || line.is_empty() {
                continue;
            }
            
            if let Some((key, value)) = line.split_once(':') {
                match key {
                    // 服务器信息
                    "redis_version" => { server_info.insert("version".to_string(), value.into()); }
                    "redis_mode" => { server_info.insert("mode".to_string(), value.into()); }
                    "uptime_in_seconds" => { 
                        if let Ok(uptime) = value.parse::<u64>() {
                            server_info.insert("uptime_seconds".to_string(), uptime.into());
                            server_info.insert("uptime_days".to_string(), (uptime / 86400).into());
                        }
                    }
                    
                    // 内存信息
                    "used_memory" => { 
                        if let Ok(bytes) = value.parse::<u64>() {
                            memory_info.insert("used_bytes".to_string(), bytes.into());
                            memory_info.insert("used_mb".to_string(), (bytes / (1024 * 1024)).into());
                        }
                    }
                    "used_memory_peak" => {
                        if let Ok(bytes) = value.parse::<u64>() {
                            memory_info.insert("peak_bytes".to_string(), bytes.into());
                            memory_info.insert("peak_mb".to_string(), (bytes / (1024 * 1024)).into());
                        }
                    }
                    "maxmemory" => {
                        if let Ok(bytes) = value.parse::<u64>() {
                            memory_info.insert("max_bytes".to_string(), bytes.into());
                            memory_info.insert("max_mb".to_string(), (bytes / (1024 * 1024)).into());
                        }
                    }
                    
                    // 统计信息
                    "total_connections_received" => {
                        if let Ok(count) = value.parse::<u64>() {
                            stats_info.insert("total_connections".to_string(), count.into());
                        }
                    }
                    "total_commands_processed" => {
                        if let Ok(count) = value.parse::<u64>() {
                            stats_info.insert("total_commands".to_string(), count.into());
                        }
                    }
                    "instantaneous_ops_per_sec" => {
                        if let Ok(ops) = value.parse::<u64>() {
                            stats_info.insert("ops_per_sec".to_string(), ops.into());
                        }
                    }
                    
                    // 键空间信息
                    key if key.starts_with("db") => {
                        keyspace_info.insert(key.to_string(), value.into());
                    }
                    
                    _ => {}
                }
            }
        }
        
        status_data["server"] = server_info.into();
        status_data["memory"] = memory_info.into();
        status_data["stats"] = stats_info.into();
        status_data["keyspace"] = keyspace_info.into();
    } else {
        status_data["error"] = serde_json::Value::String("无法获取Redis详细信息".to_string());
    }
    
    // 获取连接池状态
    let pool_stats = redis.get_pool_stats().await;
    status_data["pool"] = serde_json::json!({
        "active_connections": pool_stats.active,
        "idle_connections": pool_stats.idle,
        "total_connections": pool_stats.total,
        "max_connections": pool_stats.max
    });
    
    Ok(warp::reply::json(&status_data))
}

async fn handle_redis_flush(request: serde_json::Value, ws_manager: Arc<WebSocketManager>) -> Result<impl warp::Reply, warp::Rejection> {
    let pattern = request.get("pattern").and_then(|v| v.as_str()).unwrap_or("*");
    let db_index = request.get("db").and_then(|v| v.as_u64()).unwrap_or(0) as i64;
    let confirm = request.get("confirm").and_then(|v| v.as_bool()).unwrap_or(false);
    
    if !confirm {
        return Ok(warp::reply::json(&serde_json::json!({
            "success": false,
            "message": "需要确认才能执行刷新操作",
            "require_confirm": true
        })));
    }
    
    let redis = ws_manager.redis.write().await;
    
    // 选择数据库
    if let Err(e) = redis.select_db(db_index).await {
        return Ok(warp::reply::json(&serde_json::json!({
            "success": false,
            "message": format!("选择数据库失败: {}", e)
        })));
    }
    
    // 获取匹配的键
    match redis.scan_keys(pattern).await {
        Ok(keys) => {
            let key_count = keys.len();
            
            if key_count == 0 {
                return Ok(warp::reply::json(&serde_json::json!({
                    "success": true,
                    "message": "没有找到匹配的键",
                    "deleted_count": 0
                })));
            }
            
            // 批量删除键
            let mut deleted_count = 0;
            for chunk in keys.chunks(100) {
                if let Ok(count) = redis.delete_keys(chunk).await {
                    deleted_count += count;
                }
            }
            
            Ok(warp::reply::json(&serde_json::json!({
                "success": true,
                "message": format!("成功删除 {} 个键", deleted_count),
                "deleted_count": deleted_count,
                "pattern": pattern
            })))
        }
        Err(e) => {
            Ok(warp::reply::json(&serde_json::json!({
                "success": false,
                "message": format!("扫描键失败: {}", e)
            })))
        }
    }
}

async fn handle_redis_keys(request: serde_json::Value, ws_manager: Arc<WebSocketManager>) -> Result<impl warp::Reply, warp::Rejection> {
    let pattern = request.get("pattern").and_then(|v| v.as_str()).unwrap_or("*");
    let db_index = request.get("db").and_then(|v| v.as_u64()).unwrap_or(0) as i64;
    let limit = request.get("limit").and_then(|v| v.as_u64()).unwrap_or(100) as usize;
    let with_ttl = request.get("with_ttl").and_then(|v| v.as_bool()).unwrap_or(false);
    let with_type = request.get("with_type").and_then(|v| v.as_bool()).unwrap_or(false);
    
    let redis = ws_manager.redis.read().await;
    
    // 选择数据库
    if let Err(e) = redis.select_db(db_index).await {
        return Ok(warp::reply::json(&serde_json::json!({
            "success": false,
            "message": format!("选择数据库失败: {}", e)
        })));
    }
    
    // 扫描键
    match redis.scan_keys(pattern).await {
        Ok(all_keys) => {
            let total_count = all_keys.len();
            let keys: Vec<_> = all_keys.into_iter().take(limit).collect();
            
            let mut key_infos = Vec::new();
            
            for key in keys {
                let mut info = serde_json::json!({
                    "key": key.clone()
                });
                
                // 获取TTL
                if with_ttl {
                    if let Ok(ttl) = redis.get_ttl(&key).await {
                        info["ttl"] = ttl.into();
                    }
                }
                
                // 获取类型
                if with_type {
                    if let Ok(key_type) = redis.get_key_type(&key).await {
                        info["type"] = key_type.into();
                        
                        // 根据类型获取大小
                        match key_type.as_str() {
                            "string" => {
                                if let Ok(size) = redis.strlen(&key).await {
                                    info["size"] = size.into();
                                }
                            }
                            "list" => {
                                if let Ok(size) = redis.llen(&key).await {
                                    info["size"] = size.into();
                                }
                            }
                            "set" => {
                                if let Ok(size) = redis.scard(&key).await {
                                    info["size"] = size.into();
                                }
                            }
                            "zset" => {
                                if let Ok(size) = redis.zcard(&key).await {
                                    info["size"] = size.into();
                                }
                            }
                            "hash" => {
                                if let Ok(size) = redis.hlen(&key).await {
                                    info["size"] = size.into();
                                }
                            }
                            _ => {}
                        }
                    }
                }
                
                key_infos.push(info);
            }
            
            Ok(warp::reply::json(&serde_json::json!({
                "success": true,
                "keys": key_infos,
                "total_count": total_count,
                "limit": limit,
                "pattern": pattern,
                "db": db_index
            })))
        }
        Err(e) => {
            Ok(warp::reply::json(&serde_json::json!({
                "success": false,
                "message": format!("扫描键失败: {}", e)
            })))
        }
    }
}
