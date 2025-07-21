use warp::Filter;
use crate::swagger::get_simple_openapi_spec;

/// 构建Swagger UI路由
pub fn build_swagger_routes() -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
    
    // OpenAPI规范JSON路由 - 使用简化版本
    let openapi_json = warp::path!("api" / "openapi.json")
        .and(warp::get())
        .map(|| {
            let spec = get_simple_openapi_spec();
            warp::reply::json(&spec)
        });

    // Swagger UI路由 - 支持多个路径
    let swagger_ui = warp::path("api-docs")
        .and(warp::get())
        .and(warp::path::end())
        .map(|| {
            let html = r#"<!DOCTYPE html>
<html>
<head>
  <title>企业级客服系统 API 文档</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #3b4151; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: "list",
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
        supportedSubmitMethods: ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'],
        requestInterceptor: function(request) {
          // 添加默认headers
          if (!request.headers['Content-Type'] && request.method !== 'GET') {
            request.headers['Content-Type'] = 'application/json';
          }
          return request;
        },
        onComplete: function() {
          console.log("Swagger UI 加载完成");
        }
      });
      
      window.ui = ui;
    };
  </script>
</body>
</html>"#;
            warp::reply::html(html)
        });

    // 简单的swagger路径
    let swagger_simple = warp::path("swagger")
        .and(warp::get())
        .and(warp::path::end())
        .map(|| {
            warp::reply::with_header(
                warp::reply::with_status("", warp::http::StatusCode::MOVED_PERMANENTLY),
                "Location",
                "/api-docs"
            )
        });

    // Swagger UI路由 - 兼容旧路径
    let swagger_ui_legacy = warp::path("swagger-ui")
        .and(warp::get())
        .and(warp::path::end())
        .map(|| {
            warp::reply::with_header(
                warp::reply::with_status("", warp::http::StatusCode::MOVED_PERMANENTLY),
                "Location",
                "/api-docs"
            )
        });

    // ReDoc路由
    let redoc = warp::path("redoc")
        .and(warp::get())
        .and(warp::path::end())
        .map(|| {
            let html = r#"<!DOCTYPE html>
<html>
<head>
  <title>企业级客服系统 API 文档 - ReDoc</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="redoc-container"></div>
  <script src="https://cdn.jsdelivr.net/npm/redoc@2.0.0/bundles/redoc.standalone.js"></script>
  <script>
    Redoc.init('/api/openapi.json', {
      scrollYOffset: 50,
      theme: {
        colors: {
          primary: {
            main: '#2196F3'
          }
        },
        typography: {
          fontSize: '14px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }
      }
    }, document.getElementById('redoc-container'));
  </script>
</body>
</html>"#;
            warp::reply::html(html)
        });

    // RapiDoc路由
    let rapidoc = warp::path("rapidoc")
        .and(warp::get())
        .and(warp::path::end())
        .map(|| {
            let html = r##"<!DOCTYPE html>
<html>
<head>
  <title>企业级客服系统 API 文档 - RapiDoc</title>
  <meta charset="utf-8">
  <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
</head>
<body>
  <rapi-doc 
    spec-url="/api/openapi.json"
    render-style="view"
    theme="light"
    primary-color="#2196F3"
    nav-bg-color="#f7f7f7"
    nav-text-color="#444"
    nav-hover-text-color="#2196F3"
    font-size="default"
    show-header="true"
    allow-try="true"
    allow-authentication="true"
    allow-server-selection="true"
    show-info="true"
    show-components="true"
  > </rapi-doc>
</body>
</html>"##;
            warp::reply::html(html)
        });

    // API文档首页路由
    let docs_index = warp::path("docs")
        .and(warp::get())
        .and(warp::path::end())
        .map(|| {
            let html = r#"
<!DOCTYPE html>
<html>
<head>
    <title>企业级客服系统 API 文档</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .doc-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 30px; }
        .doc-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-decoration: none; color: #333; transition: all 0.3s; background: #fafafa; }
        .doc-card:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.1); background: #f0f0f0; transform: translateY(-2px); }
        .doc-card h3 { margin-top: 0; color: #2196F3; }
        .version { color: #666; font-size: 0.9em; }
        .status { margin: 20px 0; padding: 15px; background: #e8f5e9; border-radius: 4px; color: #2e7d32; }
        ul { line-height: 1.8; }
        code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 企业级客服系统 API 文档</h1>
        <p class="version">版本: 1.0.0</p>
        
        <div class="status">
            ✅ API文档服务正在运行 | 端口: 6006
        </div>
        
        <p>选择您偏好的API文档查看方式：</p>
        
        <div class="doc-links">
            <a href="/api-docs" class="doc-card">
                <h3>📘 Swagger UI</h3>
                <p>经典的OpenAPI文档界面，支持在线测试API接口</p>
            </a>
            
            <a href="/redoc" class="doc-card">
                <h3>📗 ReDoc</h3>
                <p>现代化的API文档界面，具有优雅的设计和响应式布局</p>
            </a>
            
            <a href="/rapidoc" class="doc-card">
                <h3>📙 RapiDoc</h3>
                <p>快速加载的API文档界面，支持多种主题和布局</p>
            </a>
            
            <a href="/api/openapi.json" class="doc-card">
                <h3>📄 OpenAPI JSON</h3>
                <p>原始的OpenAPI规范文件，可用于代码生成工具</p>
            </a>
        </div>
        
        <h2>主要功能模块</h2>
        <ul>
            <li><strong>系统模块</strong>: 健康检查 <code>/health</code>、系统信息 <code>/api/system/info</code>、在线用户 <code>/api/online/users</code></li>
            <li><strong>文件模块</strong>: 文件上传 <code>POST /api/file/upload</code>、文件列表 <code>GET /api/file/list</code>、文件下载 <code>GET /api/file/download/{id}</code></li>
            <li><strong>WebSocket</strong>: 实时通信 <code>ws://localhost:6006/ws</code></li>
            <li><strong>认证模块</strong>: 用户登录、会话管理、权限验证</li>
            <li><strong>消息模块</strong>: 消息发送、历史记录、搜索导出</li>
        </ul>
        
        <h2>快速测试</h2>
        <ul>
            <li>系统信息: <a href="/api/system/info" target="_blank">/api/system/info</a></li>
            <li>健康检查: <a href="/health" target="_blank">/health</a></li>
            <li>在线用户: <a href="/api/online/users" target="_blank">/api/online/users</a></li>
            <li>测试页面: <a href="/test.html" target="_blank">/test.html</a></li>
        </ul>
    </div>
</body>
</html>
            "#;
            warp::reply::html(html)
        });

    // 日志中间件
    let with_log = warp::log::custom(|info| {
        tracing::info!(
            "📚 API文档访问: {} {} -> {}",
            info.method(),
            info.path(),
            info.status()
        );
    });

    // 组合所有路由并添加日志
    openapi_json
        .or(swagger_ui)
        .or(swagger_simple)
        .or(swagger_ui_legacy)
        .or(redoc)
        .or(rapidoc)
        .or(docs_index)
        .with(with_log)
}
