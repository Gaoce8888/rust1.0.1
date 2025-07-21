use std::sync::Arc;
use std::time::Duration;
use anyhow::Result;
use tokio::time::interval;
use tracing::{info, error};

use crate::auth::{KefuAuthManager, CustomerManager};
use crate::redis_pool::RedisPoolManager;

/// 心跳检测服务
pub struct HeartbeatService {
    kefu_auth_manager: Arc<KefuAuthManager>,
    customer_manager: Arc<CustomerManager>,
    cleanup_interval: Duration,
}

impl HeartbeatService {
    /// 创建新的心跳检测服务
    pub fn new(
        redis_pool: Arc<RedisPoolManager>,
        kefu_auth_manager: Arc<KefuAuthManager>,
    ) -> Self {
        let customer_manager = Arc::new(CustomerManager::new(redis_pool.clone(), kefu_auth_manager.clone()));
        
        Self {
            kefu_auth_manager,
            customer_manager,
            cleanup_interval: Duration::from_secs(60), // 每分钟清理一次
        }
    }

    /// 启动心跳检测服务
    pub async fn start(&self) -> Result<()> {
        info!("🫀 启动心跳检测服务");
        
        let mut interval_timer = interval(self.cleanup_interval);
        
        loop {
            interval_timer.tick().await;
            
            if let Err(e) = self.perform_cleanup().await {
                error!("💥 心跳检测清理失败: {}", e);
            }
        }
    }

    /// 执行清理操作
    async fn perform_cleanup(&self) -> Result<()> {
        info!("🧹 开始执行连接清理...");
        
        // 清理过期的客服连接
        if let Err(e) = self.kefu_auth_manager.cleanup_expired_kefu().await {
            error!("💥 清理过期客服连接失败: {}", e);
        } else {
            info!("✅ 客服连接清理完成");
        }
        
        // 清理过期的客户连接
        if let Err(e) = self.customer_manager.cleanup_expired_customers().await {
            error!("💥 清理过期客户连接失败: {}", e);
        } else {
            info!("✅ 客户连接清理完成");
        }
        
        // 输出统计信息
        self.print_statistics().await?;
        
        Ok(())
    }

    /// 打印统计信息
    async fn print_statistics(&self) -> Result<()> {
        let kefu_count = self.kefu_auth_manager.get_online_kefu_count().await?;
        let customer_count = self.customer_manager.get_connected_customer_count().await?;
        
        info!("📊 当前在线统计 - 客服: {}, 客户: {}", kefu_count, customer_count);
        
        // 获取在线客服列表
        let online_kefu = self.kefu_auth_manager.get_online_kefu_list().await?;
        for kefu in online_kefu {
            info!("👨‍💼 客服 {} ({}) - 客户数: {}/{}", 
                kefu.real_name, kefu.kefu_id, kefu.current_customers, kefu.max_customers);
        }
        
        // 获取连接的客户列表
        let connected_customers = self.customer_manager.get_connected_customers().await?;
        for customer in connected_customers {
            let status = match customer.status {
                crate::auth::CustomerStatus::Waiting => "等待分配",
                crate::auth::CustomerStatus::Connected => "已连接",
                crate::auth::CustomerStatus::Disconnected => "已断开",
            };
            info!("👤 客户 {} ({}) - 状态: {}, 客服: {:?}", 
                customer.customer_name, customer.customer_id, status, customer.assigned_kefu_id);
        }
        
        Ok(())
    }

    /// 设置清理间隔
    pub fn set_cleanup_interval(&mut self, interval: Duration) {
        self.cleanup_interval = interval;
        info!("⏰ 心跳检测间隔已设置为: {:?}", interval);
    }

    /// 手动执行一次清理
    pub async fn manual_cleanup(&self) -> Result<()> {
        info!("🔧 手动执行连接清理");
        self.perform_cleanup().await
    }

    /// 获取服务状态
    pub async fn get_service_status(&self) -> Result<ServiceStatus> {
        let kefu_count = self.kefu_auth_manager.get_online_kefu_count().await?;
        let customer_count = self.customer_manager.get_connected_customer_count().await?;
        
        Ok(ServiceStatus {
            cleanup_interval_seconds: self.cleanup_interval.as_secs(),
            online_kefu_count: kefu_count,
            connected_customer_count: customer_count,
            service_running: true,
        })
    }
}

/// 服务状态信息
#[derive(Debug, serde::Serialize)]
pub struct ServiceStatus {
    pub cleanup_interval_seconds: u64,
    pub online_kefu_count: usize,
    pub connected_customer_count: usize,
    pub service_running: bool,
}

/// 启动心跳检测服务的后台任务
pub async fn start_heartbeat_service_background(
    redis_pool: Arc<RedisPoolManager>,
    kefu_auth_manager: Arc<KefuAuthManager>,
) -> Result<()> {
    let heartbeat_service = HeartbeatService::new(redis_pool, kefu_auth_manager);
    
    // 在后台运行心跳检测服务
    tokio::spawn(async move {
        if let Err(e) = heartbeat_service.start().await {
            error!("💥 心跳检测服务异常退出: {}", e);
        }
    });
    
    info!("✅ 心跳检测服务已在后台启动");
    Ok(())
}