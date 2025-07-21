//! Crate-level lint configuration: 允许在需要保留 async 接口的情况下存在无 await 的 async 函数。
#![allow(clippy::unused_async)]
#![recursion_limit = "512"]
#![allow(clippy::single_component_path_imports)]
#![allow(clippy::redundant_field_names)]
#![allow(clippy::if_same_then_else)]
#![allow(clippy::bool_assert_comparison)]
#![allow(clippy::assertions_on_constants)]

// 核心模块
mod compression;
mod config;
mod file_manager;
mod file_manager_ext;  // 新增：文件管理器扩展
mod html_template_manager;
mod react_template_manager;
mod message;
mod message_queue;
mod redis_client;
mod redis_pool;
mod storage;
mod websocket;
mod user_manager;
mod voice_message;
mod platform;  // 新增：跨平台兼容性模块

// 新的模块结构
mod types;
mod errors;
mod auth;
mod handlers;
mod routes;
mod server;
mod ai;

// Swagger文档模块
mod swagger;

use anyhow::Result;
use tracing::info;

use server::{initialize_system_components, start_background_tasks, start_server};

#[tokio::main]
async fn main() -> Result<()> {
    // 初始化日志
    tracing_subscriber::fmt::init();
    info!("启动企业级客服系统...");

    // 初始化系统组件
    let components = initialize_system_components().await?;

    // 启动后台任务
    start_background_tasks(&components).await;

    // 启动服务器
    start_server(components).await
}
