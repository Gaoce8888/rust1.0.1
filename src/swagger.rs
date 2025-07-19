use utoipa::{
    openapi::security::{ApiKey, ApiKeyValue, SecurityScheme},
    Modify, OpenApi,
};
use utoipa::openapi::{OpenApiBuilder, InfoBuilder, PathsBuilder, ComponentsBuilder, tag::TagBuilder};

/// 企业级客服系统 API 文档
#[derive(OpenApi)]
#[openapi(
    info(
        title = "企业级客服系统 API",
        description = "提供完整的企业级客服系统 API 文档，包括认证、用户管理、文件管理、语音消息等功能",
        version = "1.0.0",
        contact(
            name = "技术支持",
            email = "support@example.com"
        ),
        license(
            name = "MIT",
            url = "https://opensource.org/licenses/MIT"
        )
    ),
    servers(
        (url = "/", description = "本地开发环境"),
        (url = "https://api.example.com", description = "生产环境")
    ),
    paths(
        // 系统相关 API
        crate::handlers::system::handle_system_info,
        crate::handlers::system::handle_system_health,
        crate::handlers::system::handle_online_users,
    ),
    components(
        schemas(
            // API通用类型
            crate::types::api::ApiResponse<serde_json::Value>,
            crate::types::api::SystemInfo,
            crate::types::api::SystemHealth,
            crate::types::api::OnlineUserInfo,
        )
    ),
    modifiers(&SecurityAddon),
    tags(
        (name = "系统", description = "系统信息和配置相关接口"),
        (name = "认证", description = "用户认证和授权相关接口"),
        (name = "文件", description = "文件上传、下载和管理相关接口"),
        (name = "WebSocket", description = "WebSocket连接和实时通信相关接口"),
    )
)]
pub struct _ApiDoc;

/// 添加安全配置
pub struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_auth",
                SecurityScheme::ApiKey(ApiKey::Header(ApiKeyValue::new("Authorization"))),
            );
            components.add_security_scheme(
                "session_token",
                SecurityScheme::ApiKey(ApiKey::Header(ApiKeyValue::new("session-id"))),
            );
            components.add_security_scheme(
                "user_info",
                SecurityScheme::ApiKey(ApiKey::Header(ApiKeyValue::new("user-id"))),
            );
        }
    }
}

/// 获取OpenAPI规范JSON
pub fn _get_openapi_spec() -> utoipa::openapi::OpenApi {
    // 使用更简单的方式创建OpenAPI文档
    let openapi = OpenApiBuilder::new()
        .info(InfoBuilder::new()
            .title("企业级客服系统 API")
            .description(Some("提供完整的企业级客服系统 API 文档"))
            .version("1.0.0")
            .license(Some(utoipa::openapi::LicenseBuilder::new()
                .name("MIT")
                .url(Some("https://opensource.org/licenses/MIT"))
                .build()))
            .build())
        .servers(Some(vec![
            utoipa::openapi::ServerBuilder::new()
                .url("/")
                .description(Some("本地开发环境"))
                .build(),
        ]))
        .tags(Some(vec![
            TagBuilder::new()
                .name("系统")
                .description(Some("系统信息和配置相关接口"))
                .build(),
            TagBuilder::new()
                .name("文件")
                .description(Some("文件上传、下载和管理相关接口"))
                .build(),
            TagBuilder::new()
                .name("WebSocket")
                .description(Some("WebSocket连接和实时通信相关接口"))
                .build(),
        ]))
        .paths(PathsBuilder::new().build())
        .components(Some(ComponentsBuilder::new().build()))
        .build();
    
    openapi
}

/// 获取简化的OpenAPI规范JSON（用于测试）
pub fn get_simple_openapi_spec() -> serde_json::Value {
    serde_json::json!({
        "openapi": "3.0.0",
        "info": {
            "title": "企业级客服系统 API",
            "description": "提供完整的企业级客服系统 API 文档",
            "version": "1.0.0",
            "contact": {
                "name": "技术支持",
                "email": "support@example.com"
            },
            "license": {
                "name": "MIT",
                "url": "https://opensource.org/licenses/MIT"
            }
        },
        "servers": [
            {
                "url": "http://localhost:6006",
                "description": "本地开发环境"
            }
        ],
        "tags": [
            {
                "name": "系统",
                "description": "系统信息和配置相关接口"
            },
            {
                "name": "文件",
                "description": "文件上传、下载和管理相关接口"
            },
            {
                "name": "WebSocket",
                "description": "WebSocket连接和实时通信相关接口"
            }
        ],
        "paths": {
            "/health": {
                "get": {
                    "tags": ["系统"],
                    "summary": "健康检查",
                    "description": "检查系统是否正常运行",
                    "responses": {
                        "200": {
                            "description": "系统健康状态",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "status": {
                                                "type": "string",
                                                "example": "ok"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/system/info": {
                "get": {
                    "tags": ["系统"],
                    "summary": "获取系统信息",
                    "description": "获取系统运行状态和统计信息",
                    "responses": {
                        "200": {
                            "description": "系统信息",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/ApiResponse"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/online/users": {
                "get": {
                    "tags": ["系统"],
                    "summary": "获取在线用户列表",
                    "description": "获取当前所有在线用户的详细信息",
                    "responses": {
                        "200": {
                            "description": "在线用户列表",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/ApiResponse"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/ws": {
                "get": {
                    "tags": ["WebSocket"],
                    "summary": "WebSocket连接",
                    "description": "建立WebSocket连接进行实时通信",
                    "parameters": [
                        {
                            "name": "user_id",
                            "in": "query",
                            "required": true,
                            "description": "用户ID",
                            "schema": {
                                "type": "string"
                            }
                        },
                        {
                            "name": "user_type",
                            "in": "query",
                            "required": true,
                            "description": "用户类型",
                            "schema": {
                                "type": "string",
                                "enum": ["user", "service", "admin"]
                            }
                        }
                    ],
                    "responses": {
                        "101": {
                            "description": "切换协议为WebSocket"
                        }
                    }
                }
            },
            "/api/file/upload": {
                "post": {
                    "tags": ["文件"],
                    "summary": "文件上传",
                    "description": "上传文件到服务器",
                    "requestBody": {
                        "required": true,
                        "content": {
                            "multipart/form-data": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "file": {
                                            "type": "string",
                                            "format": "binary",
                                            "description": "要上传的文件"
                                        },
                                        "category": {
                                            "type": "string",
                                            "description": "文件分类"
                                        },
                                        "user_id": {
                                            "type": "string",
                                            "description": "上传用户ID"
                                        }
                                    },
                                    "required": ["file"]
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "上传成功",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/ApiResponse"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/file/list": {
                "get": {
                    "tags": ["文件"],
                    "summary": "获取文件列表",
                    "description": "获取已上传文件的列表",
                    "parameters": [
                        {
                            "name": "page",
                            "in": "query",
                            "description": "页码",
                            "schema": {
                                "type": "integer",
                                "default": 1
                            }
                        },
                        {
                            "name": "limit",
                            "in": "query",
                            "description": "每页数量",
                            "schema": {
                                "type": "integer",
                                "default": 20
                            }
                        },
                        {
                            "name": "category",
                            "in": "query",
                            "description": "文件分类",
                            "schema": {
                                "type": "string"
                            }
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "文件列表",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/ApiResponse"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/file/download/{file_id}": {
                "get": {
                    "tags": ["文件"],
                    "summary": "下载文件",
                    "description": "根据文件ID下载文件",
                    "parameters": [
                        {
                            "name": "file_id",
                            "in": "path",
                            "required": true,
                            "description": "文件ID",
                            "schema": {
                                "type": "string"
                            }
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "文件内容",
                            "content": {
                                "application/octet-stream": {
                                    "schema": {
                                        "type": "string",
                                        "format": "binary"
                                    }
                                }
                            }
                        },
                        "404": {
                            "description": "文件不存在"
                        }
                    }
                }
            },
            "/api/file/{file_id}": {
                "delete": {
                    "tags": ["文件"],
                    "summary": "删除文件",
                    "description": "根据文件ID删除文件",
                    "parameters": [
                        {
                            "name": "file_id",
                            "in": "path",
                            "required": true,
                            "description": "文件ID",
                            "schema": {
                                "type": "string"
                            }
                        }
                    ],
                    "responses": {
                        "200": {
                            "description": "删除成功",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "$ref": "#/components/schemas/ApiResponse"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "components": {
            "schemas": {
                "ApiResponse": {
                    "type": "object",
                    "properties": {
                        "success": {
                            "type": "boolean",
                            "description": "请求是否成功"
                        },
                        "message": {
                            "type": "string",
                            "description": "响应消息"
                        },
                        "data": {
                            "type": "object",
                            "description": "响应数据",
                            "nullable": true
                        }
                    },
                    "required": ["success", "message"]
                },
                "SystemInfo": {
                    "type": "object",
                    "properties": {
                        "version": {
                            "type": "string",
                            "description": "系统版本"
                        },
                        "online_users": {
                            "type": "integer",
                            "description": "在线用户数"
                        },
                        "active_sessions": {
                            "type": "integer",
                            "description": "活跃会话数"
                        },
                        "total_messages": {
                            "type": "integer",
                            "description": "消息总数"
                        },
                        "queue_size": {
                            "type": "integer",
                            "description": "消息队列大小"
                        },
                        "uptime": {
                            "type": "string",
                            "description": "系统运行时间"
                        }
                    }
                },
                "OnlineUserInfo": {
                    "type": "object",
                    "properties": {
                        "user_id": {
                            "type": "string",
                            "description": "用户ID"
                        },
                        "user_type": {
                            "type": "string",
                            "enum": ["user", "service", "admin"],
                            "description": "用户类型"
                        },
                        "connected_at": {
                            "type": "string",
                            "format": "date-time",
                            "description": "连接时间"
                        },
                        "last_active": {
                            "type": "string",
                            "format": "date-time",
                            "description": "最后活跃时间"
                        }
                    }
                }
            },
            "securitySchemes": {
                "bearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                    "description": "JWT认证令牌"
                },
                "sessionToken": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "session-id",
                    "description": "会话ID"
                },
                "userId": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "user-id",
                    "description": "用户ID"
                }
            }
        }
    })
}
