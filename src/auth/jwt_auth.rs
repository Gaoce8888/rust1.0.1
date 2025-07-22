use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use jsonwebtoken::{encode, decode, Header, Algorithm, Validation, EncodingKey, DecodingKey};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{Utc, Duration};
use uuid::Uuid;
use crate::redis_pool::RedisPoolManager;
use crate::types::api::ApiError;

/// JWT Claims 结构
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,        // 用户ID
    pub username: String,   // 用户名
    pub user_type: String,  // 用户类型: kefu, customer
    pub exp: i64,          // 过期时间
    pub iat: i64,          // 签发时间
    pub jti: String,       // JWT ID (用于防止重复使用)
}

/// 用户信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub password_hash: String,
    pub user_type: String,
    pub display_name: String,
    pub email: Option<String>,
    pub created_at: i64,
    pub last_login: Option<i64>,
    pub is_active: bool,
}

/// 登录请求
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
    pub user_type: String, // kefu 或 customer
}

/// 登录响应
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserInfo,
    pub expires_in: i64,
}

/// 用户信息（不包含敏感数据）
#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: String,
    pub username: String,
    pub user_type: String,
    pub display_name: String,
    pub email: Option<String>,
}

/// 在线状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnlineStatus {
    pub user_id: String,
    pub username: String,
    pub user_type: String,
    pub session_id: String,
    pub last_activity: i64,
    pub is_online: bool,
    pub connection_count: usize,
}

/// JWT认证管理器
pub struct JwtAuthManager {
    redis_pool: Arc<RedisPoolManager>,
    jwt_secret: String,
    jwt_expiration_hours: i64,
    online_users: Arc<RwLock<HashMap<String, OnlineStatus>>>,
}

impl JwtAuthManager {
    pub fn new(redis_pool: Arc<RedisPoolManager>) -> Self {
        Self {
            redis_pool,
            jwt_secret: std::env::var("JWT_SECRET").unwrap_or_else(|_| {
                tracing::warn!("JWT_SECRET not set, using default secret");
                "your-secret-key-change-in-production".to_string()
            }),
            jwt_expiration_hours: 24,
            online_users: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 初始化默认用户
    pub async fn initialize_default_users(&self) -> Result<(), Box<dyn std::error::Error>> {
        let default_users = vec![
            User {
                id: "kefu_001".to_string(),
                username: "admin".to_string(),
                password_hash: hash("admin123", DEFAULT_COST)?,
                user_type: "kefu".to_string(),
                display_name: "系统管理员".to_string(),
                email: Some("admin@example.com".to_string()),
                created_at: Utc::now().timestamp(),
                last_login: None,
                is_active: true,
            },
            User {
                id: "kefu_002".to_string(),
                username: "kefu1".to_string(),
                password_hash: hash("kefu123", DEFAULT_COST)?,
                user_type: "kefu".to_string(),
                display_name: "客服001".to_string(),
                email: Some("kefu1@example.com".to_string()),
                created_at: Utc::now().timestamp(),
                last_login: None,
                is_active: true,
            },
        ];

        for user in default_users {
            self.save_user(&user).await?;
        }

        tracing::info!("✅ 默认用户初始化完成");
        Ok(())
    }

    /// 用户登录
    pub async fn login(&self, request: LoginRequest) -> Result<LoginResponse, ApiError> {
        // 验证输入
        if request.username.is_empty() || request.password.is_empty() {
            return Err(ApiError::new("用户名和密码不能为空".to_string(), Some(400)));
        }

        // 获取用户信息
        let user = self.get_user_by_username(&request.username).await
            .map_err(|_| ApiError::new("用户不存在".to_string(), Some(404)))?;

        // 验证用户类型
        if user.user_type != request.user_type {
            return Err(ApiError::new("用户类型不匹配".to_string(), Some(403)));
        }

        // 验证密码
        if !verify(&request.password, &user.password_hash)
            .map_err(|_| ApiError::new("密码验证失败".to_string(), Some(500)))? {
            return Err(ApiError::new("密码错误".to_string(), Some(401)));
        }

        // 检查用户是否已在线（防止重复登录）
        if self.is_user_online(&user.id).await {
            // 强制下线之前的会话
            self.force_logout(&user.id).await;
        }

        // 生成JWT token
        let token = self.generate_token(&user).await?;

        // 更新在线状态
        let session_id = Uuid::new_v4().to_string();
        self.update_online_status(&user.id, &user.username, &user.user_type, &session_id, true).await;

        // 更新最后登录时间
        self.update_last_login(&user.id).await;

        let user_info = UserInfo {
            id: user.id,
            username: user.username,
            user_type: user.user_type,
            display_name: user.display_name,
            email: user.email,
        };

        Ok(LoginResponse {
            token,
            user: user_info,
            expires_in: self.jwt_expiration_hours * 3600,
        })
    }

    /// 验证JWT token
    pub async fn verify_token(&self, token: &str) -> Result<Claims, ApiError> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_ref()),
            &Validation::new(Algorithm::HS256)
        ).map_err(|_| ApiError::new("无效的token".to_string(), Some(401)))?;

        let claims = token_data.claims;

        // 检查token是否过期
        if claims.exp < Utc::now().timestamp() {
            return Err(ApiError::new("token已过期".to_string(), Some(401)));
        }

        // 检查用户是否仍然在线
        if !self.is_user_online(&claims.sub).await {
            return Err(ApiError::new("用户已下线".to_string(), Some(401)));
        }

        // 更新最后活动时间
        self.update_user_activity(&claims.sub).await;

        Ok(claims)
    }

    /// 用户登出
    pub async fn logout(&self, user_id: &str) -> Result<(), ApiError> {
        self.force_logout(user_id).await;
        Ok(())
    }

    /// 获取在线用户列表
    pub async fn get_online_users(&self, user_type: Option<&str>) -> Vec<OnlineStatus> {
        let online_users = self.online_users.read().await;
        online_users.values()
            .filter(|status| {
                if let Some(ut) = user_type {
                    status.user_type == ut
                } else {
                    true
                }
            })
            .cloned()
            .collect()
    }

    /// 检查用户是否在线
    pub async fn is_user_online(&self, user_id: &str) -> bool {
        let online_users = self.online_users.read().await;
        online_users.contains_key(user_id)
    }

    /// 强制用户下线
    async fn force_logout(&self, user_id: &str) {
        let mut online_users = self.online_users.write().await;
        online_users.remove(user_id);
        
        // 从Redis中清除用户会话
        let _ = self.redis_pool.execute_async(|mut conn| async move {
            let _: Result<(), redis::RedisError> = redis::cmd("DEL")
                .arg(format!("user_session:{}", user_id))
                .query_async(&mut conn)
                .await;
            Ok((conn, ()))
        }).await;
    }

    /// 更新在线状态
    async fn update_online_status(&self, user_id: &str, username: &str, user_type: &str, session_id: &str, is_online: bool) {
        let mut online_users = self.online_users.write().await;
        let status = OnlineStatus {
            user_id: user_id.to_string(),
            username: username.to_string(),
            user_type: user_type.to_string(),
            session_id: session_id.to_string(),
            last_activity: Utc::now().timestamp(),
            is_online,
            connection_count: if is_online { 1 } else { 0 },
        };
        online_users.insert(user_id.to_string(), status);
    }

    /// 更新用户活动时间
    async fn update_user_activity(&self, user_id: &str) {
        let mut online_users = self.online_users.write().await;
        if let Some(status) = online_users.get_mut(user_id) {
            status.last_activity = Utc::now().timestamp();
        }
    }

    /// 生成JWT token
    async fn generate_token(&self, user: &User) -> Result<String, ApiError> {
        let now = Utc::now();
        let expires_at = now + Duration::hours(self.jwt_expiration_hours);
        let jti = Uuid::new_v4().to_string();

        let claims = Claims {
            sub: user.id.clone(),
            username: user.username.clone(),
            user_type: user.user_type.clone(),
            exp: expires_at.timestamp(),
            iat: now.timestamp(),
            jti,
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_ref())
        ).map_err(|_| ApiError::new("生成token失败".to_string(), Some(500)))
    }

    /// 保存用户到Redis
    async fn save_user(&self, user: &User) -> Result<(), Box<dyn std::error::Error>> {
        let user_json = serde_json::to_string(user)?;
        
        self.redis_pool.execute_async(|mut conn| async move {
            let _: Result<(), redis::RedisError> = redis::cmd("HSET")
                .arg("users")
                .arg(&user.username)
                .arg(&user_json)
                .query_async(&mut conn)
                .await;
            Ok((conn, ()))
        }).await?;

        Ok(())
    }

    /// 从Redis获取用户
    async fn get_user_by_username(&self, username: &str) -> Result<User, Box<dyn std::error::Error>> {
        let user_json: String = self.redis_pool.execute_async(|mut conn| async move {
            let result: Result<String, redis::RedisError> = redis::cmd("HGET")
                .arg("users")
                .arg(username)
                .query_async(&mut conn)
                .await;
            Ok((conn, result))
        }).await??;

        let user: User = serde_json::from_str(&user_json)?;
        Ok(user)
    }

    /// 更新最后登录时间
    async fn update_last_login(&self, user_id: &str) {
        let _ = self.redis_pool.execute_async(|mut conn| async move {
            let _: Result<(), redis::RedisError> = redis::cmd("HSET")
                .arg("users")
                .arg(format!("{}:last_login", user_id))
                .arg(Utc::now().timestamp())
                .query_async(&mut conn)
                .await;
            Ok((conn, ()))
        }).await;
    }
}