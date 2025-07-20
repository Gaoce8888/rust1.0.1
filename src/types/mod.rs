/// 类型定义模块
/// 
/// 包含整个系统中使用的通用类型定义和数据结构。
/// 按功能属性分类，确保类型定义的一致性和可维护性。
/// 
/// # 子模块说明
/// - `api`: API相关的请求和响应类型
/// - `auth`: 认证授权相关的类型定义
/// - `config`: 配置信息相关的类型
/// - `websocket`: WebSocket连接相关的类型
/// 
/// # 设计原则
/// - 类型安全：使用强类型系统防止运行时错误
/// - 序列化支持：所有类型都支持JSON序列化/反序列化
/// - 文档化：每个类型都有详细的字段说明
/// - 扩展性：预留扩展字段便于未来功能升级
pub mod api;
pub mod auth;
pub mod config;
pub mod websocket;
pub mod frontend_compatibility;

// 重新导出常用类型，方便其他模块使用
pub use api::ApiResponse;
pub use auth::AppUserInfo;
// 按需导出配置类型，避免通配符导入
// 这些类型将在系统配置API中使用
#[allow(unused_imports)]
pub use config::{SystemConfig, WebSocketConfig, ApiConfig, UploadConfig, HtmlTemplateConfig};

#[cfg(test)]
mod tests {
    use super::*;
    use super::api::SuccessResponse;
    
    #[test]
    fn test_api_response_serialization() {
        let response: ApiResponse<String> = ApiResponse {
            success: true,
            message: "测试成功".to_string(),
            data: Some("测试数据".to_string()),
        };
        
        let json = serde_json::to_string(&response);
        assert!(json.is_ok(), "ApiResponse应该可以正常序列化");
        
        let json_str = json.unwrap();
        let deserialized: Result<ApiResponse<String>, _> = serde_json::from_str(&json_str);
        assert!(deserialized.is_ok(), "ApiResponse应该可以正常反序列化");
    }
    
    #[test]
    fn test_success_response_creation() {
        let response = SuccessResponse {
            success: true,
            message: "操作成功".to_string(),
        };
        
        assert!(response.success);
        assert_eq!(response.message, "操作成功");
    }
    
    #[test]
    fn test_app_user_info_fields() {
        use crate::message::UserType;
        
        let user_info = AppUserInfo {
            id: "user123".to_string(),
            name: "张三".to_string(),
            user_type: UserType::Kefu,
        };
        
        assert_eq!(user_info.id, "user123");
        assert_eq!(user_info.name, "张三");
        assert!(matches!(user_info.user_type, UserType::Kefu));
    }
} 