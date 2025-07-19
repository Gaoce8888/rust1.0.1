use warp::Filter;
use tracing::info;

/// 构建前端路由
pub fn build_frontend_routes() -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    
    // 主页路由 - 服务入口页面
    let index_route = warp::path::end()
        .and(warp::get())
        .and_then(|| async {
            info!("🏠 主页被访问");
            let html_content = std::fs::read_to_string("static/index.html")
                .map_err(|e| {
                    tracing::error!("读取主页失败: {:?}", e);
                    warp::reject::not_found()
                })?;
            Ok::<_, warp::Rejection>(warp::reply::html(html_content))
        });

    // 客服端主页路由 /kefu
    let kefu_index_route = warp::path("kefu")
        .and(warp::path::end())
        .and(warp::get())
        .and_then(|| async {
            info!("👔 客服端主页被访问");
            // 使用构建后的文件
            let html_content = std::fs::read_to_string("static/react-kefu/dist/index.html")
                .or_else(|_| std::fs::read_to_string("static/react-kefu/index.html"))
                .map_err(|e| {
                    tracing::error!("读取客服端主页失败: {:?}", e);
                    warp::reject::not_found()
                })?;
            
            // 修复资源路径，添加/kefu前缀
            let html_content = html_content
                .replace("src=\"/assets/", "src=\"/kefu/assets/")
                .replace("href=\"/assets/", "href=\"/kefu/assets/")
                .replace("src=\"/src/", "src=\"/kefu/src/");
                
            Ok::<_, warp::Rejection>(warp::reply::html(html_content))
        });

    // 客户端主页路由 /kehu  
    let kehu_index_route = warp::path("kehu")
        .and(warp::path::end())
        .and(warp::get())
        .and_then(|| async {
            info!("📱 客户端主页被访问");
            let html_content = std::fs::read_to_string("static/react-kehu/index.html")
                .map_err(|e| {
                    tracing::error!("读取客户端主页失败: {:?}", e);
                    warp::reject::not_found()
                })?;
            Ok::<_, warp::Rejection>(warp::reply::html(html_content))
        });

    // 客服端静态资源路由 /kefu/*
    let kefu_static_route = warp::path("kefu")
        .and(warp::fs::dir("static/react-kefu/dist")
            .or(warp::fs::dir("static/react-kefu")));

    // 客户端静态资源路由 /kehu/*
    let kehu_static_route = warp::path("kehu")
        .and(warp::fs::dir("static/react-kehu"));

    // Demo客服端页面路由  
    let demo_kefu_route = warp::path!("demo" / "kefu.html")
        .and(warp::get())
        .and_then(|| async {
            info!("👔 Demo客服端页面被访问");
            let html_content = std::fs::read_to_string("static/demo/kefu.html")
                .map_err(|e| {
                    tracing::error!("读取Demo客服端页面失败: {:?}", e);
                    warp::reject::not_found()
                })?;
            Ok::<_, warp::Rejection>(warp::reply::html(html_content))
        });

    // Demo客户端页面路由
    let demo_kehu_route = warp::path!("demo" / "kehu.html")
        .and(warp::get())
        .and_then(|| async {
            info!("📱 Demo客户端页面被访问");
            let html_content = std::fs::read_to_string("static/demo/kehu.html")
                .map_err(|e| {
                    tracing::error!("读取Demo客户端页面失败: {:?}", e);
                    warp::reject::not_found()
                })?;
            Ok::<_, warp::Rejection>(warp::reply::html(html_content))
        });

    // Demo主页路由
    let demo_route = warp::path("demo")
        .and(warp::get())
        .and(warp::path::end())
        .and_then(|| async {
            info!("🎯 Demo页面被访问");
            let html_content = std::fs::read_to_string("static/demo/demo.html")
                .map_err(|e| {
                    tracing::error!("读取Demo页面失败: {:?}", e);
                    warp::reject::not_found()
                })?;
            Ok::<_, warp::Rejection>(warp::reply::html(html_content))
        });

    // 静态资源路由 - 服务static目录中的所有文件
    let static_files = warp::fs::dir("static");

    // 组合所有前端路由
    index_route
        .or(kefu_index_route)
        .or(kefu_static_route)
        .or(kehu_index_route)
        .or(kehu_static_route)
        .or(static_files)
} 