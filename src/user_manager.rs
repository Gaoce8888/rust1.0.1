use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use std::fs;
use chrono::{DateTime, Duration, Utc};
use uuid::Uuid;
use tracing::{info, warn, error};
use redis::{Client, Commands, RedisResult};
use anyhow::Result;

// 辅助函数：将时间间隔转换为人类可读格式
fn humanize_duration(duration: Duration) -> String {
    let total_seconds = duration.num_seconds();
    
    if total_seconds < 60 {
        format!("{total_seconds}秒")
    } else if total_seconds < 3600 {
        let minutes = total_seconds / 60;
        format!("{minutes}分钟")
    } else if total_seconds < 86400 {
        let hours = total_seconds / 3600;
        let minutes = (total_seconds % 3600) / 60;
        if minutes > 0 {
            format!("{hours}小时{minutes}分钟")
        } else {
            format!("{hours}小时")
        }
    } else {
        let days = total_seconds / 86400;
        let hours = (total_seconds % 86400) / 3600;
        if hours > 0 {
            format!("{days}天{hours}小时")
        } else {
            format!("{days}天")
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub password: String, // 在生产环境中应该加密存储
    pub display_name: String,
    pub role: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
    pub permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub session_id: String,
    pub user_id: String,
    pub username: String,
    pub display_name: String,
    pub role: String,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub ip_address: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserData {
    pub users: Vec<User>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LoginRequest {
    /// 用户名
    pub username: String,
    /// 密码
    pub password: String,
    /// 角色（可选）
    pub role: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LoginResponse {
    /// 登录是否成功
    pub success: bool,
    /// 响应消息
    pub message: String,
    /// 会话ID
    pub session_id: Option<String>,
    /// 用户信息
    pub user: Option<UserInfo>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UserInfo {
    /// 用户ID
    pub id: String,
    /// 用户名
    pub username: String,
    /// 显示名称
    pub display_name: String,
    /// 角色
    pub role: String,
    /// 权限列表
    pub permissions: Vec<String>,
}

pub struct UserManager {
    users: Vec<User>,
    #[allow(dead_code)]
    file_path: String,
    redis_client: Client,
    session_ttl: i64, // Redis过期时间（秒）
}

impl UserManager {
    pub fn new(file_path: &str) -> Result<Self> {
        // 从文件加载用户数据
        let users = Self::load_users(file_path)?;
        
        // 连接Redis
        let redis_url = std::env::var("REDIS_URL")
            .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
        let redis_client = Client::open(redis_url)?;
        
        // 测试Redis连接
        let mut conn = redis_client.get_connection()?;
        let _: String = redis::cmd("PING").query(&mut conn)?;
        info!("✅ Redis连接成功");
        
        Ok(UserManager {
            users,
            file_path: file_path.to_string(),
            redis_client,
            session_ttl: 180 * 24 * 3600, // 180天
        })
    }

    fn load_users(file_path: &str) -> Result<Vec<User>> {
        let content = fs::read_to_string(file_path)?;
        let data: UserData = serde_json::from_str(&content)?;
        info!("✅ 成功加载用户数据，共{}个用户", data.users.len());
        Ok(data.users)
    }

    #[allow(dead_code)]
    async fn save_users(&self) -> Result<()> {
        let data = UserData {
            users: self.users.clone(),
        };
        let content = serde_json::to_string_pretty(&data)?;
        fs::write(&self.file_path, content)?;
        info!("💾 用户数据已保存到文件: {}", self.file_path);
        Ok(())
    }

    // Redis键名规范
    fn online_key(user_id: &str) -> String {
        format!("online:user:{user_id}")
    }

    fn session_key(session_id: &str) -> String {
        format!("session:{session_id}")
    }

    #[allow(dead_code)]
    pub async fn authenticate(&self, username: &str, password: &str, ip_address: Option<String>) -> LoginResponse {
        self.authenticate_internal(username, password, ip_address, false).await
    }

    #[allow(dead_code)]
    pub async fn force_authenticate(&self, username: &str, password: &str, ip_address: Option<String>) -> LoginResponse {
        self.authenticate_internal(username, password, ip_address, true).await
    }

    #[allow(dead_code)]
    async fn authenticate_internal(&self, username: &str, password: &str, ip_address: Option<String>, force_login: bool) -> LoginResponse {
        info!("🔐 尝试登录: 用户名={}", username);
        
        // 查找用户
        let user = if let Some(user) = self.users.iter().find(|u| u.username == username && u.status == "active") { user.clone() } else {
            warn!("❌ 登录失败: 用户名不存在或已禁用 - {}", username);
            return LoginResponse {
                success: false,
                message: "用户名或密码错误".to_string(),
                session_id: None,
                user: None,
            };
        };

        // 验证密码
        if user.password != password {
            warn!("❌ 登录失败: 密码错误 - {}", username);
            return LoginResponse {
                success: false,
                message: "用户名或密码错误".to_string(),
                session_id: None,
                user: None,
            };
        }

        // 获取Redis连接
        let mut conn = match self.redis_client.get_connection() {
            Ok(conn) => conn,
            Err(e) => {
                error!("Redis连接失败: {:?}", e);
                return LoginResponse {
                    success: false,
                    message: "服务器内部错误".to_string(),
                    session_id: None,
                    user: None,
                };
            }
        };

        let online_key = Self::online_key(&user.id);
        
        // 如果是强制登录，先删除现有的在线状态
        if force_login {
            // 获取现有会话ID并删除会话数据
            if let Ok(existing_session_id) = conn.get::<_, String>(&online_key) {
                let session_key = Self::session_key(&existing_session_id);
                let _: RedisResult<()> = conn.del(&session_key);
                info!("🔧 强制登录：已清理会话 {}", existing_session_id);
            }
            let _: RedisResult<()> = conn.del(&online_key);
        }

        // 创建新会话
        let session_id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let session = Session {
            session_id: session_id.clone(),
            user_id: user.id.clone(),
            username: user.username.clone(),
            display_name: user.display_name.clone(),
            role: user.role.clone(),
            created_at: now,
            last_activity: now,
            expires_at: now + chrono::Duration::days(180),
            ip_address: ip_address.clone(),
        };

        // 序列化会话数据
        let session_data = match serde_json::to_string(&session) {
            Ok(data) => data,
            Err(e) => {
                error!("会话序列化失败: {:?}", e);
                return LoginResponse {
                    success: false,
                    message: "服务器内部错误".to_string(),
                    session_id: None,
                    user: None,
                };
            }
        };

        // 使用SET NX原子操作检查并设置在线状态
        let set_result: RedisResult<String> = redis::cmd("SET")
            .arg(&online_key)
            .arg(&session_id)
            .arg("NX")
            .arg("EX")
            .arg(self.session_ttl)
            .query(&mut conn);

        if let Ok(_) = set_result {
            // 成功设置在线状态，保存会话数据
            let session_key = Self::session_key(&session_id);
            let _: RedisResult<()> = conn.set_ex(&session_key, session_data, self.session_ttl as usize);
            
            info!("✅ 登录成功: 用户={}, 会话ID={}", username, session_id);
            
            LoginResponse {
                success: true,
                message: "登录成功".to_string(),
                session_id: Some(session_id),
                user: Some(UserInfo {
                    id: user.id.clone(),
                    username: user.username.clone(),
                    display_name: user.display_name.clone(),
                    role: user.role.clone(),
                    permissions: user.permissions.clone(),
                }),
            }
        } else {
            // 用户已在线，获取现有会话信息
            if let Ok(existing_session_id) = conn.get::<_, String>(&online_key) {
                let session_key = Self::session_key(&existing_session_id);
                if let Ok(session_data) = conn.get::<_, String>(&session_key) {
                    if let Ok(existing_session) = serde_json::from_str::<Session>(&session_data) {
                        let ip_info = existing_session.ip_address.as_ref().map_or_else(|| "IP: 未知".to_string(), |ip| format!("IP: {ip}"));
                        
                        let login_time = existing_session.created_at.format("%Y-%m-%d %H:%M:%S");
                        let last_activity_time = existing_session.last_activity.format("%Y-%m-%d %H:%M:%S");
                        let inactive_duration = now - existing_session.last_activity;
                        let activity_duration = humanize_duration(inactive_duration);
                        
                        warn!("⚠️ 拒绝登录：用户{}已在线", username);
                        
                        return LoginResponse {
                            success: false,
                            message: format!("该账号已在其他设备登录\n\n在线状态:\n• {ip_info}\n• 登录时间: {login_time}\n• 最后活动: {last_activity_time} ({activity_duration}前)\n• 会话ID: {existing_session_id}"),
                            session_id: None,
                            user: None,
                        };
                    }
                }
            }
            
            // 无法获取会话信息，返回通用错误
            LoginResponse {
                success: false,
                message: "该账号已在其他设备登录".to_string(),
                session_id: None,
                user: None,
            }
        }
    }

    #[allow(dead_code)]
    pub async fn validate_session(&self, session_id: &str) -> Option<Session> {
        let mut conn = self.redis_client.get_connection().ok()?;
        let session_key = Self::session_key(session_id);
        
        let session_data: String = conn.get(&session_key).ok()?;
        let session: Session = serde_json::from_str(&session_data).ok()?;
        
        if session.expires_at > Utc::now() {
            Some(session)
        } else {
            info!("🕐 会话已过期: {}", session_id);
            None
        }
    }

    #[allow(dead_code)]
    pub async fn logout(&self, session_id: &str) -> bool {
        info!("🚪 用户登出: 会话ID={}", session_id);
        
        let mut conn = match self.redis_client.get_connection() {
            Ok(conn) => conn,
            Err(e) => {
                error!("Redis连接失败: {:?}", e);
                return false;
            }
        };

        // 获取会话信息
        let session_key = Self::session_key(session_id);
        if let Ok(session_data) = conn.get::<_, String>(&session_key) {
            if let Ok(session) = serde_json::from_str::<Session>(&session_data) {
                // 删除在线状态
                let online_key = Self::online_key(&session.user_id);
                let _: RedisResult<()> = conn.del(&online_key);
                
                // 删除会话数据
                let _: RedisResult<()> = conn.del(&session_key);
                
                info!("✅ 会话已清除: {}", session_id);
                return true;
            }
        }
        
        warn!("⚠️ 会话不存在: {}", session_id);
        false
    }

    /// 刷新会话过期时间
    /// 
    /// 这是企业级会话管理的核心功能，用于延长用户会话
    /// 在高并发环境下确保用户体验连续性
    #[allow(dead_code)] // 企业级功能：会话刷新机制，在某些场景下会被调用
    pub async fn refresh_session(&self, session_id: &str) -> bool {
        let mut conn = match self.redis_client.get_connection() {
            Ok(conn) => conn,
            Err(_) => return false,
        };

        let session_key = Self::session_key(session_id);
        
        // 获取并更新会话
        if let Ok(session_data) = conn.get::<_, String>(&session_key) {
            if let Ok(mut session) = serde_json::from_str::<Session>(&session_data) {
                if session.expires_at > Utc::now() {
                    session.last_activity = Utc::now();
                    session.expires_at = Utc::now() + chrono::Duration::days(180);
                    
                    if let Ok(updated_data) = serde_json::to_string(&session) {
                        let _: RedisResult<()> = conn.set_ex(&session_key, updated_data, self.session_ttl as usize);
                        
                        // 同时更新在线状态的过期时间
                        let online_key = Self::online_key(&session.user_id);
                        let _: RedisResult<()> = conn.expire(&online_key, self.session_ttl as usize);
                        
                        info!("🔄 会话已刷新: {}", session_id);
                        return true;
                    }
                }
            }
        }
        false
    }

    // 心跳检测 - 更新会话活动时间
    #[allow(dead_code)]
    pub async fn heartbeat(&self, session_id: &str) -> bool {
        let mut conn = match self.redis_client.get_connection() {
            Ok(conn) => conn,
            Err(_) => return false,
        };

        let session_key = Self::session_key(session_id);
        
        // 获取并更新会话的最后活动时间
        if let Ok(session_data) = conn.get::<_, String>(&session_key) {
            if let Ok(mut session) = serde_json::from_str::<Session>(&session_data) {
                if session.expires_at > Utc::now() {
                    session.last_activity = Utc::now();
                    
                    if let Ok(updated_data) = serde_json::to_string(&session) {
                        let _: RedisResult<()> = conn.set_ex(&session_key, updated_data, self.session_ttl as usize);
                        return true;
                    }
                }
            }
        }
        false
    }

    // 基于Redis的在线状态检测
    #[allow(dead_code)]
    pub async fn is_user_session_active(&self, username: &str) -> bool {
        // 查找用户ID
        let user_id = match self.users.iter().find(|u| u.username == username) {
            Some(user) => &user.id,
            None => return false,
        };

        let mut conn = match self.redis_client.get_connection() {
            Ok(conn) => conn,
            Err(_) => return false,
        };

        let online_key = Self::online_key(user_id);
        
        // 检查是否存在在线记录
        if let Ok(session_id) = conn.get::<_, String>(&online_key) {
            // 检查会话是否有效
            let session_key = Self::session_key(&session_id);
            if let Ok(session_data) = conn.get::<_, String>(&session_key) {
                if let Ok(session) = serde_json::from_str::<Session>(&session_data) {
                    let now = Utc::now();
                    let activity_threshold = Duration::minutes(30);
                    
                    return session.expires_at > now && 
                           (now - session.last_activity) <= activity_threshold;
                }
            }
        }
        false
    }

    // 获取用户的在线状态信息
    #[allow(dead_code)]
    pub async fn get_user_online_info(&self, username: &str) -> Option<(String, DateTime<Utc>, String)> {
        // 查找用户ID
        let user_id = self.users.iter()
            .find(|u| u.username == username)
            .map(|u| &u.id)?;

        let mut conn = self.redis_client.get_connection().ok()?;
        let online_key = Self::online_key(user_id);
        
        let session_id: String = conn.get(&online_key).ok()?;
        let session_key = Self::session_key(&session_id);
        let session_data: String = conn.get(&session_key).ok()?;
        let session: Session = serde_json::from_str(&session_data).ok()?;
        
        if session.expires_at > Utc::now() {
            let ip = session.ip_address.unwrap_or_else(|| "未知".to_string());
            Some((session.session_id, session.last_activity, ip))
        } else {
            None
        }
    }

    #[allow(dead_code)]
    pub async fn get_active_sessions(&self) -> Vec<Session> {
        let mut conn = match self.redis_client.get_connection() {
            Ok(conn) => conn,
            Err(_) => return Vec::new(),
        };

        let mut active_sessions = Vec::new();
        
        // 扫描所有会话键
        let pattern = "session:*";
        let keys: Vec<String> = match redis::cmd("KEYS").arg(pattern).query(&mut conn) {
            Ok(keys) => keys,
            Err(_) => return Vec::new(),
        };

        for key in keys {
            if let Ok(session_data) = conn.get::<_, String>(&key) {
                if let Ok(session) = serde_json::from_str::<Session>(&session_data) {
                    if session.expires_at > Utc::now() {
                        active_sessions.push(session);
                    }
                }
            }
        }
        
        active_sessions
    }

    #[allow(dead_code)]
    pub async fn cleanup_expired_sessions(&self) {
        // Redis会自动处理过期，这个方法保留接口兼容性
        info!("🧹 Redis自动处理过期会话，无需手动清理");
    }
}

// Cargo.toml 依赖项：
// [dependencies]
// redis = { version = "0.23", features = ["tokio-comp"] }
// serde = { version = "1.0", features = ["derive"] }
// serde_json = "1.0"
// chrono = { version = "0.4", features = ["serde"] }
// uuid = { version = "1.0", features = ["v4", "serde"] }
// tracing = "0.1"
// anyhow = "1.0"
// tokio = { version = "1", features = ["full"] }