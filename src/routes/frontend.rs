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
            // 优先使用构建后的文件，如果不存在则使用开发版本
            let html_content = std::fs::read_to_string("static/kefu-build/index.html")
                .or_else(|_| std::fs::read_to_string("static/react-kefu/dist/index.html"))
                .or_else(|_| std::fs::read_to_string("static/react-kefu/index.html"))
                .map_err(|e| {
                    tracing::error!("读取客服端主页失败: {:?}", e);
                    warp::reject::not_found()
                })?;
            
            // 修复资源路径，添加/kefu前缀
            let html_content = html_content
                .replace("=\"/assets/", "=\"/kefu/assets/")
                .replace("=\"/js/", "=\"/kefu/js/")
                .replace("src=\"/src/", "src=\"/kefu/src/");
                
            Ok::<_, warp::Rejection>(warp::reply::html(html_content))
        });

    // 客户端主页路由 /kehu  
    let kehu_index_route = warp::path("kehu")
        .and(warp::path::end())
        .and(warp::get())
        .and_then(|| async {
            info!("📱 客户端主页被访问");
            // 优先使用构建后的文件
            let html_content = std::fs::read_to_string("static/kehu-build/index.html")
                .or_else(|_| std::fs::read_to_string("static/react-kehu/index.html"))
                .map_err(|e| {
                    tracing::error!("读取客户端主页失败: {:?}", e);
                    warp::reject::not_found()
                })?;
                
            // 修复资源路径
            let html_content = html_content
                .replace("=\"/assets/", "=\"/kehu/assets/")
                .replace("=\"/js/", "=\"/kehu/js/");
                
            Ok::<_, warp::Rejection>(warp::reply::html(html_content))
        });

    // 客服端静态资源路由 - 支持多个可能的目录
    let kefu_build_route = warp::path("kefu")
        .and(warp::fs::dir("static/kefu-build"));
    
    let kefu_dist_route = warp::path("kefu")
        .and(warp::fs::dir("static/react-kefu/dist"));
        
    let kefu_dev_route = warp::path("kefu")
        .and(warp::fs::dir("static/react-kefu"));

    // 客户端静态资源路由
    let kehu_build_route = warp::path("kehu")
        .and(warp::fs::dir("static/kehu-build"));
        
    let kehu_static_route = warp::path("kehu")
        .and(warp::fs::dir("static/react-kehu"));

    // 静态资源路由 - 服务static目录中的所有文件
    let static_files = warp::fs::dir("static");

    // 组合所有前端路由 - 优先级顺序很重要
    index_route
        .or(kefu_index_route)
        .or(kefu_build_route)
        .or(kefu_dist_route)
        .or(kefu_dev_route)
        .or(kehu_index_route)
        .or(kehu_build_route)
        .or(kehu_static_route)
        .or(static_files)
} 