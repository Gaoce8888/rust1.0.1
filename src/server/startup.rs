use anyhow::Result;
use std::sync::Arc;
use tracing::info;
use warp::Filter;
use crate::config::AppConfig;
use crate::errors::handle_rejection;
use crate::routes::{build_all_routes, RouteBuilderConfig};
use crate::server::components::SystemComponents;

/// 启动服务器
pub async fn start_server(components: SystemComponents) -> Result<()> {
    let config = AppConfig::get();

    // 构建路由配置
    let route_config = RouteBuilderConfig {
        ws_manager: components.ws_manager.clone(),
        file_manager: components.file_manager.clone(),
        html_manager: components.html_manager.clone(),
        user_manager: components.user_manager.clone(),
        voice_manager: components.voice_manager.clone(),
        storage: Arc::new(components.storage.clone()),
        ai_manager: components.ai_manager.clone(),
        kefu_auth_manager: components.kefu_auth_manager.clone(),
    };

    // 构建路由
    let routes = build_all_routes(route_config);

    // 配置CORS - 简化实现
    let cors = warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["content-type", "authorization", "user-id", "user-name", "user-type", "session-id"])
        .allow_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"]);

    let final_routes = routes
        .recover(handle_rejection)
        .with(warp::log::custom(|info| {
            info!(
                "🔍 路由调试: {} {} -> 状态: {} | 耗时: {:?} | 来源: {:?}",
                info.method(),
                info.path(),
                info.status().as_u16(),
                info.elapsed(),
                info.remote_addr()
            );
        }))
        .with(cors);

    let addr = ([0, 0, 0, 0], config.server.port);
    
    // 打印启动信息
    print_startup_info(config);
    
    // 自动打开浏览器
    let url = format!("http://localhost:{}", config.server.port);
    open_browser(&url);

    warp::serve(final_routes).run(addr).await;

    Ok(())
}

/// 打开浏览器
fn open_browser(url: &str) {
    info!("🌐 正在打开浏览器: {}", url);
    
    // 根据操作系统选择不同的命令
    #[cfg(target_os = "windows")]
    {
        if let Err(e) = std::process::Command::new("cmd")
            .args(["/C", "start", url])
            .spawn()
        {
            info!("⚠️ 无法自动打开浏览器: {}。请手动访问: {}", e, url);
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        if let Err(e) = std::process::Command::new("open")
            .arg(url)
            .spawn()
        {
            info!("⚠️ 无法自动打开浏览器: {}。请手动访问: {}", e, url);
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        if let Err(e) = std::process::Command::new("xdg-open")
            .arg(url)
            .spawn()
        {
            info!("⚠️ 无法自动打开浏览器: {}。请手动访问: {}", e, url);
        }
    }
}

/// 打印启动信息
fn print_startup_info(config: &AppConfig) {
    info!("🚀 企业级客服系统启动成功！");
    info!(
        "📡 HTTP服务器地址: http://{}:{}",
        config.server.host, config.server.port
    );
    info!(
        "🔌 WebSocket地址: ws://{}:{}/ws",
        config.server.host, config.server.port
    );
    info!(
        "📚 API文档: http://{}:{}/api-docs",
        config.server.host, config.server.port
    );
    info!(
        "🎯 前端地址: http://{}:{}",
        config.server.host, config.server.port
    );
    info!("💡 如果浏览器没有自动打开，请手动访问上述地址");
}
