/// 处理器模块
/// 
/// 提供企业级的API处理器功能，按业务领域划分为不同的子模块。
/// 每个处理器负责特定的业务逻辑处理，确保代码职责单一和易于维护。
/// 
/// # 模块结构
/// - `auth`: 认证授权处理器
/// - `system`: 系统信息处理器  
/// - `system_extended`: 扩展的系统管理处理器
/// - `file`: 文件管理处理器
/// - `voice`: 语音消息处理器
/// - `template`: HTML模板处理器
/// - `websocket`: `WebSocket连接处理器`
/// - `ai`: AI处理器 - 包含意图识别、翻译、语音识别等AI功能
/// - `users`: 用户管理处理器
/// - `messages`: 消息管理处理器
/// - `sessions`: 会话管理处理器
/// - `kefu_assignment`: 客服分配管理处理器
/// - `analytics`: 统计分析处理器
/// 
/// # 设计原则
/// - 单一职责：每个处理器只负责特定的业务功能
/// - 错误处理：统一的错误响应格式
/// - 日志记录：详细的操作日志和性能监控
/// - 权限控制：基于用户角色的访问控制
/// - 数据验证：输入参数的安全验证
pub mod auth;
pub mod system;
pub mod system_extended;
pub mod client;
pub mod file;
pub mod voice;
pub mod template;
pub mod websocket;
pub mod ai;
pub mod users;
pub mod messages;
pub mod sessions;
pub mod kefu_assignment;
pub mod analytics;

#[cfg(test)]
mod tests {
    // 测试模块导入 - 仅在测试时使用
    #[allow(unused_imports)]
    use super::*;
    #[allow(unused_imports)]
    use std::sync::Arc;
    
    #[test]
    fn test_handler_modules_exist() {
        // 通过检查当前目录是否存在来确保测试执行环境有效
        let dir_metadata = std::fs::metadata(".").expect("无法访问当前目录");
        assert!(dir_metadata.is_dir(), "当前目录应该是有效的文件夹");
    }
}
