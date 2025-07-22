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
        customer_manager: components.customer_manager.clone(),
        redis_pool: components.redis_pool.clone(),
        jwt_auth_manager: components.jwt_auth_manager.clone(),
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
    info!("📊 系统信息:");
    info!("   - 应用名称: {}", config.app.name);
    info!("   - 版本: {}", config.app.version);
    info!("   - 端口: {}", config.server.port);
    info!("   - Redis: {}:{}", config.redis.host, config.redis.port);
    info!("   - 数据目录: {}", config.storage.data_dir);
    info!("");
    info!("🔗 访问地址:");
    info!("   - 主页面: http://localhost:{}", config.server.port);
    info!("   - 客服端: http://localhost:{}/kefu", config.server.port);
    info!("   - 客户端: http://localhost:{}/kehu", config.server.port);
    info!("   - API文档: http://localhost:{}/swagger", config.server.port);
    info!("   - 客户连接: http://localhost:{}/customer/connect", config.server.port);
    info!("");
    info!("🎯 功能特性:");
    info!("   - JWT认证登录系统");
    info!("   - 防止重复登录");
    info!("   - 实时状态更新");
    info!("   - WebSocket连接管理");
    info!("   - 客户连接管理");
    info!("   - Redis缓存支持，实时状态同步");
    info!("   - 心跳检测和自动清理");
    info!("");
    info!("🔐 默认用户:");
    info!("   - 管理员: admin / admin123");
    info!("   - 客服: kefu1 / kefu123");
    info!("");
    info!("✅ 系统已准备就绪，等待连接...");
}
