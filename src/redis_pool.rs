use anyhow::Result;
use deadpool_redis::{Config, Pool, Runtime};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::{error, info, warn};

// 连接池配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisPoolConfig {
    pub url: String,
    pub max_size: usize,
    pub min_idle: Option<usize>,
    pub max_lifetime: Option<Duration>,
    pub idle_timeout: Option<Duration>,
    pub connection_timeout: Duration,
    pub recycle_timeout: Duration,
}

impl Default for RedisPoolConfig {
    fn default() -> Self {
        Self {
            url: "redis://127.0.0.1:6379".to_string(),
            max_size: 32,                                  // 最大连接数
            min_idle: Some(8),                             // 最小空闲连接数
            max_lifetime: Some(Duration::from_secs(3600)), // 连接最大生存时间：1小时
            idle_timeout: Some(Duration::from_secs(600)),  // 空闲超时：10分钟
            connection_timeout: Duration::from_secs(5),    // 连接超时：5秒
            recycle_timeout: Duration::from_secs(2),       // 回收超时：2秒
        }
    }
}

// 连接池性能指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolMetrics {
    pub total_connections: usize,
    pub idle_connections: usize,
    pub active_connections: usize,
    pub total_acquired: u64,
    pub total_released: u64,
    pub acquire_timeouts: u64,
    pub connection_errors: u64,
    pub avg_acquire_time_ms: f64,
    pub max_acquire_time_ms: u64,
    pub pool_utilization: f64,
}

// 连接统计信息
#[derive(Debug)]
struct ConnectionStats {
    total_acquired: AtomicU64,
    total_released: AtomicU64,
    acquire_timeouts: AtomicU64,
    connection_errors: AtomicU64,
    total_acquire_time_ms: AtomicU64,
    max_acquire_time_ms: AtomicU64,
    acquire_count: AtomicU64,
}

impl ConnectionStats {
    fn new() -> Self {
        Self {
            total_acquired: AtomicU64::new(0),
            total_released: AtomicU64::new(0),
            acquire_timeouts: AtomicU64::new(0),
            connection_errors: AtomicU64::new(0),
            total_acquire_time_ms: AtomicU64::new(0),
            max_acquire_time_ms: AtomicU64::new(0),
            acquire_count: AtomicU64::new(0),
        }
    }

    fn record_acquire(&self, duration_ms: u64) {
        self.total_acquired.fetch_add(1, Ordering::Relaxed);
        self.total_acquire_time_ms
            .fetch_add(duration_ms, Ordering::Relaxed);
        self.acquire_count.fetch_add(1, Ordering::Relaxed);

        // 更新最大获取时间
        let mut current_max = self.max_acquire_time_ms.load(Ordering::Relaxed);
        while duration_ms > current_max {
            match self.max_acquire_time_ms.compare_exchange_weak(
                current_max,
                duration_ms,
                Ordering::Relaxed,
                Ordering::Relaxed,
            ) {
                Ok(_) => break,
                Err(actual) => current_max = actual,
            }
        }
    }

    fn record_release(&self) {
        self.total_released.fetch_add(1, Ordering::Relaxed);
    }

    fn record_timeout(&self) {
        self.acquire_timeouts.fetch_add(1, Ordering::Relaxed);
    }

    fn record_error(&self) {
        self.connection_errors.fetch_add(1, Ordering::Relaxed);
    }
}

// Redis连接池管理器
pub struct RedisPoolManager {
    pool: Pool,
    config: RedisPoolConfig,
    stats: Arc<ConnectionStats>,
    health_check_interval: Duration,
}

impl std::fmt::Debug for RedisPoolManager {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("RedisPoolManager")
            .field("config", &self.config)
            .field("health_check_interval", &self.health_check_interval)
            .finish()
    }
}

impl RedisPoolManager {
    pub fn new(config: RedisPoolConfig) -> Result<Self> {
        // 创建连接池配置
        let mut pool_config = Config::from_url(&config.url);

        // 设置连接池参数 - 使用正确的API结构
        if let Some(pool_opts) = &mut pool_config.pool {
            pool_opts.max_size = config.max_size;
            if let Some(timeout) = config.idle_timeout {
                pool_opts.timeouts.wait = Some(timeout);
            }
            if let Some(timeout) = config.max_lifetime {
                pool_opts.timeouts.recycle = Some(timeout);
            }
        } else {
            // 如果pool字段为None，创建默认配置
            let mut pool_opts = deadpool_redis::PoolConfig::new(config.max_size);
            pool_opts.timeouts.wait = config.idle_timeout;
            pool_opts.timeouts.create = Some(config.connection_timeout);
            pool_opts.timeouts.recycle = config.max_lifetime;
            pool_config.pool = Some(pool_opts);
        }

        // 创建连接池
        let pool = pool_config.create_pool(Some(Runtime::Tokio1))?;

        info!(
            "Redis连接池初始化成功 - URL: {}, 最大连接数: {}, 最小空闲: {:?}",
            config.url, config.max_size, config.min_idle
        );

        Ok(Self {
            pool,
            config,
            stats: Arc::new(ConnectionStats::new()),
            health_check_interval: Duration::from_secs(30),
        })
    }

    // 获取连接（带监控）
    pub async fn get_connection(&self) -> Result<deadpool_redis::Connection> {
        let start_time = Instant::now();

        match tokio::time::timeout(self.config.connection_timeout, self.pool.get()).await {
            Ok(Ok(conn)) => {
                let acquire_time = start_time.elapsed().as_millis() as u64;
                self.stats.record_acquire(acquire_time);

                if acquire_time > 1000 {
                    warn!("Redis连接获取耗时较长: {}ms", acquire_time);
                }

                Ok(conn)
            }
            Ok(Err(e)) => {
                self.stats.record_error();
                error!("Redis连接获取失败: {:?}", e);
                Err(e.into())
            }
            Err(_) => {
                self.stats.record_timeout();
                error!(
                    "Redis连接获取超时: {}ms",
                    self.config.connection_timeout.as_millis()
                );
                Err(anyhow::anyhow!("Redis连接获取超时"))
            }
        }
    }

    // 执行Redis命令（高级接口）
    #[allow(dead_code)] // 企业级功能保留
    pub async fn execute<F, R>(&self, operation: F) -> Result<R>
    where
        F: FnOnce(&mut deadpool_redis::Connection) -> Result<R> + Send,
        R: Send,
    {
        let mut conn = self.get_connection().await?;
        let result = operation(&mut conn);
        self.stats.record_release();
        result
    }

    // 执行异步Redis命令
    #[allow(dead_code)] // 企业级功能保留
    pub async fn execute_async<F, Fut, R>(&self, operation: F) -> Result<R>
    where
        F: FnOnce(deadpool_redis::Connection) -> Fut + Send,
        Fut: std::future::Future<Output = Result<(deadpool_redis::Connection, R)>> + Send,
        R: Send,
    {
        let conn = self.get_connection().await?;
        let (returned_conn, result) = operation(conn).await?;

        // 连接会自动返回到池中
        drop(returned_conn);
        self.stats.record_release();

        Ok(result)
    }

    // 获取连接池状态
    #[allow(dead_code)] // 企业级功能保留
    pub fn get_pool_status(&self) -> deadpool_redis::Status {
        self.pool.status()
    }

    // 获取详细的性能指标
    pub fn get_metrics(&self) -> PoolMetrics {
        let status = self.pool.status();
        let total_acquired = self.stats.total_acquired.load(Ordering::Relaxed);
        let total_released = self.stats.total_released.load(Ordering::Relaxed);
        let acquire_count = self.stats.acquire_count.load(Ordering::Relaxed);
        let total_acquire_time = self.stats.total_acquire_time_ms.load(Ordering::Relaxed);

        let avg_acquire_time = if acquire_count > 0 {
            total_acquire_time as f64 / acquire_count as f64
        } else {
            0.0
        };

        let pool_utilization = if self.config.max_size > 0 {
            (status.size - status.available) as f64 / self.config.max_size as f64 * 100.0
        } else {
            0.0
        };

        PoolMetrics {
            total_connections: status.size,
            idle_connections: status.available,
            active_connections: status.size - status.available,
            total_acquired,
            total_released,
            acquire_timeouts: self.stats.acquire_timeouts.load(Ordering::Relaxed),
            connection_errors: self.stats.connection_errors.load(Ordering::Relaxed),
            avg_acquire_time_ms: avg_acquire_time,
            max_acquire_time_ms: self.stats.max_acquire_time_ms.load(Ordering::Relaxed),
            pool_utilization,
        }
    }

    // 健康检查
    pub async fn health_check(&self) -> Result<bool> {
        match self.get_connection().await {
            Ok(mut conn) => match redis::cmd("PING").query_async::<_, String>(&mut conn).await {
                Ok(response) if response == "PONG" => {
                    self.stats.record_release();
                    Ok(true)
                }
                Ok(_) => {
                    self.stats.record_error();
                    Ok(false)
                }
                Err(e) => {
                    self.stats.record_error();
                    error!("Redis健康检查失败: {:?}", e);
                    Ok(false)
                }
            },
            Err(e) => {
                error!("Redis健康检查连接失败: {:?}", e);
                Ok(false)
            }
        }
    }

    // 启动健康检查任务
    pub fn start_health_check_task(&self) -> tokio::task::JoinHandle<()> {
        let pool_manager = Arc::new(self.clone());
        let interval = self.health_check_interval;

        tokio::spawn(async move {
            let mut interval_timer = tokio::time::interval(interval);

            loop {
                interval_timer.tick().await;

                match pool_manager.health_check().await {
                    Ok(true) => {
                        let metrics = pool_manager.get_metrics();
                        info!(
                            "Redis连接池健康检查通过 - 活跃连接: {}/{}, 利用率: {:.1}%",
                            metrics.active_connections,
                            metrics.total_connections,
                            metrics.pool_utilization
                        );
                    }
                    Ok(false) => {
                        warn!("Redis连接池健康检查失败");
                    }
                    Err(e) => {
                        error!("Redis连接池健康检查错误: {:?}", e);
                    }
                }

                // 检查连接池性能警告
                let metrics = pool_manager.get_metrics();
                if metrics.pool_utilization > 80.0 {
                    warn!(
                        "Redis连接池使用率过高: {:.1}%, 考虑增加连接数",
                        metrics.pool_utilization
                    );
                }

                if metrics.avg_acquire_time_ms > 100.0 {
                    warn!(
                        "Redis连接获取平均耗时过长: {:.1}ms",
                        metrics.avg_acquire_time_ms
                    );
                }
            }
        })
    }

    // 重置统计信息
    #[allow(dead_code)] // 企业级功能保留
    pub fn reset_stats(&self) {
        self.stats.total_acquired.store(0, Ordering::Relaxed);
        self.stats.total_released.store(0, Ordering::Relaxed);
        self.stats.acquire_timeouts.store(0, Ordering::Relaxed);
        self.stats.connection_errors.store(0, Ordering::Relaxed);
        self.stats.total_acquire_time_ms.store(0, Ordering::Relaxed);
        self.stats.max_acquire_time_ms.store(0, Ordering::Relaxed);
        self.stats.acquire_count.store(0, Ordering::Relaxed);

        info!("Redis连接池统计信息已重置");
    }

    // 获取配置信息
    #[allow(dead_code)]
    pub fn get_config(&self) -> &RedisPoolConfig {
        &self.config
    }
}

// 实现Clone以支持共享
impl Clone for RedisPoolManager {
    fn clone(&self) -> Self {
        Self {
            pool: self.pool.clone(),
            config: self.config.clone(),
            stats: Arc::clone(&self.stats),
            health_check_interval: self.health_check_interval,
        }
    }
}

// 连接池指标展示
impl std::fmt::Display for PoolMetrics {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Redis连接池指标:\n\
             总连接数: {}\n\
             空闲连接: {}\n\
             活跃连接: {}\n\
             总获取次数: {}\n\
             总释放次数: {}\n\
             获取超时次数: {}\n\
             连接错误次数: {}\n\
             平均获取时间: {:.2}ms\n\
             最大获取时间: {}ms\n\
             连接池利用率: {:.1}%",
            self.total_connections,
            self.idle_connections,
            self.active_connections,
            self.total_acquired,
            self.total_released,
            self.acquire_timeouts,
            self.connection_errors,
            self.avg_acquire_time_ms,
            self.max_acquire_time_ms,
            self.pool_utilization
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[allow(unused_imports)]
    use tokio::runtime::Runtime;

    #[tokio::test]
    async fn test_pool_creation() {
        let config = RedisPoolConfig::default();
        let pool_manager = RedisPoolManager::new(config);
        assert!(pool_manager.is_ok());
    }

    #[tokio::test]
    async fn test_connection_acquisition() {
        let config = RedisPoolConfig::default();
        if let Ok(pool_manager) = RedisPoolManager::new(config) {
            // 注意：这个测试需要Redis服务器运行
            if let Ok(_conn) = pool_manager.get_connection().await {
                let metrics = pool_manager.get_metrics();
                assert!(metrics.total_acquired > 0);
            }
        }
    }

    #[tokio::test]
    async fn test_metrics_collection() {
        let config = RedisPoolConfig::default();
        if let Ok(pool_manager) = RedisPoolManager::new(config) {
            let initial_metrics = pool_manager.get_metrics();
            assert_eq!(initial_metrics.total_acquired, 0);
            assert_eq!(initial_metrics.connection_errors, 0);
        }
    }
}
