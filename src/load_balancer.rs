use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{Duration, Instant};
use tracing::{error, info, warn};

/// 负载均衡策略
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LoadBalancingStrategy {
    RoundRobin,
    LeastConnections,
    WeightedRoundRobin,
    IPHash,
    Random,
    HealthBased,
}

/// 服务器节点信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerNode {
    pub id: String,
    pub address: String,
    pub port: u16,
    pub weight: u32,
    pub max_connections: u32,
    pub current_connections: u32,
    pub status: ServerStatus,
    pub last_health_check: u64,
    pub health_score: f64,
    pub response_time: u64,
    pub error_count: u32,
    pub total_requests: u64,
    pub success_requests: u64,
}

/// 服务器状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ServerStatus {
    Healthy,
    Unhealthy,
    Maintenance,
    Overloaded,
}

/// 负载均衡器
pub struct LoadBalancer {
    strategy: LoadBalancingStrategy,
    servers: Arc<RwLock<HashMap<String, ServerNode>>>,
    current_index: Arc<RwLock<usize>>,
    health_check_interval: Duration,
    health_check_timeout: Duration,
    max_failure_threshold: u32,
    recovery_threshold: u32,
}

impl LoadBalancer {
    pub fn new(strategy: LoadBalancingStrategy) -> Self {
        Self {
            strategy,
            servers: Arc::new(RwLock::new(HashMap::new())),
            current_index: Arc::new(RwLock::new(0)),
            health_check_interval: Duration::from_secs(30),
            health_check_timeout: Duration::from_secs(5),
            max_failure_threshold: 5,
            recovery_threshold: 3,
        }
    }

    /// 添加服务器节点
    pub async fn add_server(&self, mut server: ServerNode) -> Result<()> {
        server.status = ServerStatus::Healthy;
        server.last_health_check = chrono::Utc::now().timestamp_millis() as u64;
        server.health_score = 1.0;
        
        let server_id = server.id.clone();
        let mut servers = self.servers.write().await;
        servers.insert(server_id.clone(), server);
        
        info!("Added server node: {}", server_id);
        Ok(())
    }

    /// 移除服务器节点
    pub async fn remove_server(&self, server_id: &str) -> Result<()> {
        let mut servers = self.servers.write().await;
        if servers.remove(server_id).is_some() {
            info!("Removed server node: {}", server_id);
        }
        Ok(())
    }

    /// 选择服务器节点
    pub async fn select_server(&self, client_info: Option<&ClientInfo>) -> Result<Option<ServerNode>> {
        let servers = self.servers.read().await;
        let healthy_servers: Vec<&ServerNode> = servers
            .values()
            .filter(|server| server.status == ServerStatus::Healthy)
            .collect();

        if healthy_servers.is_empty() {
            warn!("No healthy servers available");
            return Ok(None);
        }

        let selected = match self.strategy {
            LoadBalancingStrategy::RoundRobin => {
                self.round_robin_select(&healthy_servers).await
            }
            LoadBalancingStrategy::LeastConnections => {
                self.least_connections_select(&healthy_servers).await
            }
            LoadBalancingStrategy::WeightedRoundRobin => {
                self.weighted_round_robin_select(&healthy_servers).await
            }
            LoadBalancingStrategy::IPHash => {
                self.ip_hash_select(&healthy_servers, client_info).await
            }
            LoadBalancingStrategy::Random => {
                self.random_select(&healthy_servers).await
            }
            LoadBalancingStrategy::HealthBased => {
                self.health_based_select(&healthy_servers).await
            }
        };

        Ok(selected.cloned())
    }

    /// 轮询选择
    async fn round_robin_select(&self, servers: &[&ServerNode]) -> Option<&ServerNode> {
        let mut index = self.current_index.write().await;
        let selected = servers.get(*index);
        *index = (*index + 1) % servers.len();
        selected.copied()
    }

    /// 最少连接选择
    async fn least_connections_select(&self, servers: &[&ServerNode]) -> Option<&ServerNode> {
        servers
            .iter()
            .min_by_key(|server| server.current_connections)
            .copied()
    }

    /// 加权轮询选择
    async fn weighted_round_robin_select(&self, servers: &[&ServerNode]) -> Option<&ServerNode> {
        let total_weight: u32 = servers.iter().map(|s| s.weight).sum();
        if total_weight == 0 {
            return self.round_robin_select(servers).await;
        }

        let mut index = self.current_index.write().await;
        let mut current_weight = *index as u32 % total_weight;
        
        for server in servers {
            if current_weight < server.weight {
                *index = (*index + 1) % (total_weight as usize);
                return Some(server);
            }
            current_weight -= server.weight;
        }

        servers.first().copied()
    }

    /// IP哈希选择
    async fn ip_hash_select(&self, servers: &[&ServerNode], client_info: Option<&ClientInfo>) -> Option<&ServerNode> {
        if let Some(client) = client_info {
            use std::collections::hash_map::DefaultHasher;
            use std::hash::{Hash, Hasher};
            
            let mut hasher = DefaultHasher::new();
            client.ip.hash(&mut hasher);
            let hash = hasher.finish();
            
            let index = (hash as usize) % servers.len();
            servers.get(index).copied()
        } else {
            self.round_robin_select(servers).await
        }
    }

    /// 随机选择
    async fn random_select(&self, servers: &[&ServerNode]) -> Option<&ServerNode> {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let index = rng.gen_range(0..servers.len());
        servers.get(index).copied()
    }

    /// 基于健康度选择
    async fn health_based_select(&self, servers: &[&ServerNode]) -> Option<&ServerNode> {
        servers
            .iter()
            .max_by(|a, b| {
                let score_a = self.calculate_health_score(a);
                let score_b = self.calculate_health_score(b);
                score_a.partial_cmp(&score_b).unwrap_or(std::cmp::Ordering::Equal)
            })
            .copied()
    }

    /// 计算健康度分数
    fn calculate_health_score(&self, server: &ServerNode) -> f64 {
        let connection_ratio = server.current_connections as f64 / server.max_connections as f64;
        let success_ratio = if server.total_requests > 0 {
            server.success_requests as f64 / server.total_requests as f64
        } else {
            1.0
        };
        
        let response_time_score = 1.0 / (1.0 + server.response_time.as_millis() as f64 / 1000.0);
        let error_penalty = 1.0 / (1.0 + server.error_count as f64 / 10.0);
        
        server.health_score 
            * (1.0 - connection_ratio) 
            * success_ratio 
            * response_time_score 
            * error_penalty
    }

    /// 更新服务器连接数
    pub async fn update_server_connections(&self, server_id: &str, delta: i32) -> Result<()> {
        let mut servers = self.servers.write().await;
        if let Some(server) = servers.get_mut(server_id) {
            if delta > 0 {
                server.current_connections += delta as u32;
            } else {
                server.current_connections = server.current_connections.saturating_sub((-delta) as u32);
            }
            
            // 检查是否过载
            if server.current_connections >= server.max_connections {
                server.status = ServerStatus::Overloaded;
                warn!("Server {} is overloaded", server_id);
            } else if server.status == ServerStatus::Overloaded {
                server.status = ServerStatus::Healthy;
                info!("Server {} recovered from overload", server_id);
            }
        }
        Ok(())
    }

    /// 记录请求结果
    pub async fn record_request_result(&self, server_id: &str, success: bool, response_time: Duration) -> Result<()> {
        let mut servers = self.servers.write().await;
        if let Some(server) = servers.get_mut(server_id) {
            server.total_requests += 1;
            server.response_time = response_time;
            
            if success {
                server.success_requests += 1;
                server.error_count = server.error_count.saturating_sub(1);
            } else {
                server.error_count += 1;
            }
            
            // 更新健康状态
            if server.error_count >= self.max_failure_threshold {
                server.status = ServerStatus::Unhealthy;
                warn!("Server {} marked as unhealthy due to high error rate", server_id);
            } else if server.status == ServerStatus::Unhealthy && server.error_count == 0 {
                server.status = ServerStatus::Healthy;
                info!("Server {} recovered and marked as healthy", server_id);
            }
        }
        Ok(())
    }

    /// 启动健康检查
    pub async fn start_health_check(&self) -> Result<()> {
        let servers = self.servers.clone();
        let interval = self.health_check_interval;
        let timeout = self.health_check_timeout;
        
        tokio::spawn(async move {
            let mut interval_timer = tokio::time::interval(interval);
            loop {
                interval_timer.tick().await;
                Self::perform_health_check(servers.clone(), timeout).await;
            }
        });
        
        info!("Health check started with interval: {:?}", interval);
        Ok(())
    }

    /// 执行健康检查
    async fn perform_health_check(servers: Arc<RwLock<HashMap<String, ServerNode>>>, timeout: Duration) {
        let server_list = {
            let servers_guard = servers.read().await;
            servers_guard.values().cloned().collect::<Vec<_>>()
        };

        for server in server_list {
            let health_result = Self::check_server_health(&server, timeout).await;
            
            let mut servers_guard = servers.write().await;
            if let Some(server_node) = servers_guard.get_mut(&server.id) {
                server_node.last_health_check = Instant::now();
                
                match health_result {
                    Ok(score) => {
                        server_node.health_score = score;
                        if server_node.status == ServerStatus::Unhealthy {
                            server_node.status = ServerStatus::Healthy;
                            info!("Server {} recovered", server.id);
                        }
                    }
                    Err(e) => {
                        server_node.health_score = 0.0;
                        server_node.status = ServerStatus::Unhealthy;
                        warn!("Health check failed for server {}: {}", server.id, e);
                    }
                }
            }
        }
    }

    /// 检查单个服务器健康状态
    async fn check_server_health(server: &ServerNode, timeout: Duration) -> Result<f64> {
        let start_time = Instant::now();
        
        // 这里可以实现具体的健康检查逻辑
        // 例如：HTTP健康检查、TCP连接检查、Redis连接检查等
        let health_check_url = format!("http://{}:{}/health", server.address, server.port);
        
        let client = reqwest::Client::new();
        let response = tokio::time::timeout(timeout, client.get(&health_check_url).send()).await??;
        
        let response_time = start_time.elapsed();
        let status_code = response.status().as_u16();
        
        // 计算健康分数
        let health_score = if status_code == 200 {
            // 基于响应时间计算分数
            let response_time_ms = response_time.as_millis() as f64;
            (1000.0 / (1000.0 + response_time_ms)).max(0.1)
        } else {
            0.0
        };
        
        Ok(health_score)
    }

    /// 获取服务器统计信息
    pub async fn get_server_stats(&self) -> Result<LoadBalancerStats> {
        let servers = self.servers.read().await;
        let total_servers = servers.len();
        let healthy_servers = servers.values().filter(|s| s.status == ServerStatus::Healthy).count();
        let unhealthy_servers = servers.values().filter(|s| s.status == ServerStatus::Unhealthy).count();
        let overloaded_servers = servers.values().filter(|s| s.status == ServerStatus::Overloaded).count();
        
        let total_connections: u32 = servers.values().map(|s| s.current_connections).sum();
        let total_requests: u64 = servers.values().map(|s| s.total_requests).sum();
        let total_success_requests: u64 = servers.values().map(|s| s.success_requests).sum();
        
        let success_rate = if total_requests > 0 {
            total_success_requests as f64 / total_requests as f64
        } else {
            1.0
        };
        
        Ok(LoadBalancerStats {
            strategy: self.strategy.clone(),
            total_servers,
            healthy_servers,
            unhealthy_servers,
            overloaded_servers,
            total_connections,
            total_requests,
            success_rate,
            servers: servers.values().cloned().collect(),
        })
    }
}

/// 客户端信息
#[derive(Debug, Clone)]
pub struct ClientInfo {
    pub ip: String,
    pub user_agent: String,
    pub session_id: Option<String>,
}

/// 负载均衡器统计信息
#[derive(Debug, Serialize, Deserialize)]
pub struct LoadBalancerStats {
    pub strategy: LoadBalancingStrategy,
    pub total_servers: usize,
    pub healthy_servers: usize,
    pub unhealthy_servers: usize,
    pub overloaded_servers: usize,
    pub total_connections: u32,
    pub total_requests: u64,
    pub success_rate: f64,
    pub servers: Vec<ServerNode>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::Duration;

    #[tokio::test]
    async fn test_load_balancer_creation() {
        let lb = LoadBalancer::new(LoadBalancingStrategy::RoundRobin);
        assert!(lb.servers.read().await.is_empty());
    }

    #[tokio::test]
    async fn test_add_server() {
        let lb = LoadBalancer::new(LoadBalancingStrategy::RoundRobin);
        let server = ServerNode {
            id: "server1".to_string(),
            address: "127.0.0.1".to_string(),
            port: 8080,
            weight: 1,
            max_connections: 1000,
            current_connections: 0,
            status: ServerStatus::Healthy,
            last_health_check: Instant::now(),
            health_score: 1.0,
            response_time: Duration::from_millis(100),
            error_count: 0,
            total_requests: 0,
            success_requests: 0,
        };
        
        lb.add_server(server).await.unwrap();
        assert_eq!(lb.servers.read().await.len(), 1);
    }

    #[tokio::test]
    async fn test_round_robin_selection() {
        let lb = LoadBalancer::new(LoadBalancingStrategy::RoundRobin);
        
        // 添加多个服务器
        for i in 1..=3 {
            let server = ServerNode {
                id: format!("server{}", i),
                address: "127.0.0.1".to_string(),
                port: 8080 + i as u16,
                weight: 1,
                max_connections: 1000,
                current_connections: 0,
                status: ServerStatus::Healthy,
                last_health_check: Instant::now(),
                health_score: 1.0,
                response_time: Duration::from_millis(100),
                error_count: 0,
                total_requests: 0,
                success_requests: 0,
            };
            lb.add_server(server).await.unwrap();
        }
        
        // 测试轮询选择
        let selections = vec![
            lb.select_server(None).await.unwrap().unwrap().id,
            lb.select_server(None).await.unwrap().unwrap().id,
            lb.select_server(None).await.unwrap().unwrap().id,
            lb.select_server(None).await.unwrap().unwrap().id,
        ];
        
        // 验证轮询效果
        assert_eq!(selections[0], selections[3]); // 第4次应该和第1次相同
    }
}