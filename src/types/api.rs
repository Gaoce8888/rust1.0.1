use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// 通用API错误响应
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct ApiError {
    /// 操作是否成功
    pub success: bool,
    /// 错误消息
    pub message: String,
    /// 错误代码
    pub code: Option<i32>,
    /// 错误详细信息
    pub details: Option<serde_json::Value>,
}

/// 通用API响应
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct ApiResponse<T> {
    /// 操作是否成功
    pub success: bool,
    /// 响应消息
    pub message: String,
    /// 响应数据
    pub data: Option<T>,
}

/// 通用成功响应
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct SuccessResponse {
    /// 操作是否成功
    pub success: bool,
    /// 响应消息
    pub message: String,
}

/// 系统信息
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct SystemInfo {
    /// 系统名称
    pub name: String,
    /// 系统版本
    pub version: String,
    /// 在线用户数
    pub online_users: u32,
    /// 活跃会话数
    pub active_sessions: u32,
    /// 消息队列长度
    pub queue_size: u32,
    /// 服务器启动时间
    pub uptime: String,
    /// 系统时间
    pub server_time: String,
}

/// 系统健康状态
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct SystemHealth {
    /// 状态
    pub status: String,
    /// Redis连接状态
    pub redis: bool,
    /// 存储状态
    pub storage: bool,
    /// WebSocket服务状态
    pub websocket: bool,
    /// 内存使用情况
    pub memory_usage: Option<MemoryUsage>,
}

/// 内存使用情况
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct MemoryUsage {
    /// 已使用内存（字节）
    pub used: u64,
    /// 总内存（字节）
    pub total: u64,
    /// 使用百分比
    pub percentage: f32,
}

/// 在线用户信息
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct OnlineUserInfo {
    /// 用户ID
    pub user_id: String,
    /// 用户名
    pub username: String,
    /// 用户类型
    pub user_type: String,
    /// 连接时间
    pub connected_at: String,
    /// 最后活动时间
    pub last_activity: String,
    /// IP地址
    pub ip_address: Option<String>,
    /// 客户端信息
    pub client_info: Option<String>,
}

/// 文件列表查询参数
#[derive(Debug, Deserialize, ToSchema)]
pub struct FileListQuery {
    /// 页码，从1开始
    #[allow(dead_code)] // 将在文件列表API中使用
    pub page: Option<u32>,
    /// 每页条目数
    #[allow(dead_code)] // 将在文件列表API中使用
    pub limit: Option<u32>,
    /// 文件分类过滤
    #[allow(dead_code)] // 将在文件列表API中使用
    pub category: Option<String>,
    /// 排序字段
    #[allow(dead_code)] // 将在文件列表API中使用
    pub sort_by: Option<String>,
    /// 排序顺序（asc/desc）
    #[allow(dead_code)] // 将在文件列表API中使用
    pub sort_order: Option<String>,
}

/// 模板列表查询参数
#[derive(Debug, Deserialize, ToSchema)]
pub struct TemplateListQuery {
    /// 页码，从1开始
    #[allow(dead_code)] // 将在模板列表API中使用
    pub page: Option<u32>,
    /// 每页条目数
    #[allow(dead_code)] // 将在模板列表API中使用
    pub limit: Option<u32>,
    /// 模板分类过滤
    #[allow(dead_code)] // 将在模板列表API中使用
    pub category: Option<String>,
    /// 搜索关键词
    #[allow(dead_code)] // 将在模板列表API中使用
    pub search: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct IpLocationQuery {
    /// IP地址
    pub ip: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct IpLocationResponse {
    /// IP地址
    pub ip: String,
    /// 国家
    pub country: String,
    /// 省份/州
    pub region: String,
    /// 城市
    pub city: String,
    /// 纬度
    pub latitude: Option<f64>,
    /// 经度
    pub longitude: Option<f64>,
    /// ISP供应商
    pub isp: Option<String>,
    /// 时区
    pub timezone: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ClientRegisterInfo {
    /// 客户端类型 (web, mobile, desktop)
    pub client_type: String,
    /// 用户代理字符串
    pub user_agent: String,
    /// 客户端版本
    pub version: Option<String>,
    /// 操作系统
    pub os: Option<String>,
    /// 浏览器信息
    pub browser: Option<String>,
    /// 屏幕分辨率
    pub screen_resolution: Option<String>,
    /// IP地址
    pub ip_address: String,
    /// 会话ID
    pub session_id: Option<String>,
    /// 额外信息
    pub extra_info: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ClientRegisterResponse {
    /// 客户端ID
    pub client_id: String,
    /// 注册时间
    pub registered_at: String,
    /// 地理位置信息
    pub location: Option<IpLocationResponse>,
}

impl ApiError {
    /// 创建新的API错误
    #[allow(dead_code)] // 工具方法，将在错误处理中使用
    pub fn new(message: String, code: Option<i32>) -> Self {
        Self {
            success: false,
            message,
            code,
            details: None,
        }
    }
    
    /// 创建带详细信息的API错误
    #[allow(dead_code)] // 工具方法，将在错误处理中使用
    pub fn with_details(message: String, code: Option<i32>, details: serde_json::Value) -> Self {
        Self {
            success: false,
            message,
            code,
            details: Some(details),
        }
    }
}

impl<T> ApiResponse<T> {
    /// 创建成功响应
    #[allow(dead_code)] // 工具方法，将在API响应中使用
    pub fn success(message: String, data: T) -> Self {
        Self {
            success: true,
            message,
            data: Some(data),
        }
    }
    
    /// 创建错误响应
    #[allow(dead_code)] // 工具方法，将在API响应中使用
    pub fn error(message: String) -> Self {
        Self {
            success: false,
            message,
            data: None,
        }
    }
}

impl SuccessResponse {
    /// 创建成功响应
    #[allow(dead_code)] // 工具方法，将在API响应中使用
    pub fn new(message: String) -> Self {
        Self {
            success: true,
            message,
        }
    }
    
    /// 创建错误响应
    #[allow(dead_code)] // 工具方法，将在API响应中使用
    pub fn error(message: String) -> Self {
        Self {
            success: false,
            message,
        }
    }
}
