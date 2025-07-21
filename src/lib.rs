// Temporarily disabled enterprise modules for compilation
// pub mod load_balancer;
// pub mod websocket_pool;
// pub mod api_routes;
// pub mod http_fallback;
// pub mod auto_upgrade;
// pub mod performance_optimizer;
// pub mod health_monitor;
// pub mod failover_manager;

// 配置管理模块
pub mod config;

// 处理器模块
pub mod handlers;

// 其他核心模块
pub mod types;
pub mod user_manager;
pub mod websocket;
pub mod file_manager;
pub mod storage;
pub mod message;
pub mod voice_message;
pub mod html_template_manager;
pub mod ai;