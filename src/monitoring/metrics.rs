use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

/// 指标类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MetricType {
    Counter(f64),
    Gauge(f64),
    Histogram(Vec<f64>),
    Summary {
        count: u64,
        sum: f64,
        quantiles: HashMap<String, f64>,
    },
}

/// 性能指标
#[derive(Debug, Clone)]
pub struct Metric {
    pub name: String,
    pub help: String,
    pub metric_type: MetricType,
    pub labels: HashMap<String, String>,
    pub timestamp: Instant,
}

/// 指标注册中心
pub struct MetricsRegistry {
    metrics: Arc<RwLock<HashMap<String, Metric>>>,
    
    // 预定义的系统指标
    pub http_requests_total: Arc<RwLock<f64>>,
    pub http_request_duration: Arc<RwLock<Vec<f64>>>,
    pub websocket_connections: Arc<RwLock<f64>>,
    pub message_processed_total: Arc<RwLock<f64>>,
    pub redis_operations_total: Arc<RwLock<f64>>,
    pub redis_operation_duration: Arc<RwLock<Vec<f64>>>,
}

impl MetricsRegistry {
    pub fn new() -> Self {
        Self {
            metrics: Arc::new(RwLock::new(HashMap::new())),
            http_requests_total: Arc::new(RwLock::new(0.0)),
            http_request_duration: Arc::new(RwLock::new(Vec::new())),
            websocket_connections: Arc::new(RwLock::new(0.0)),
            message_processed_total: Arc::new(RwLock::new(0.0)),
            redis_operations_total: Arc::new(RwLock::new(0.0)),
            redis_operation_duration: Arc::new(RwLock::new(Vec::new())),
        }
    }
    
    /// 增加计数器
    pub async fn increment_counter(&self, name: &str, value: f64) {
        match name {
            "http_requests_total" => {
                let mut counter = self.http_requests_total.write().await;
                *counter += value;
            }
            "message_processed_total" => {
                let mut counter = self.message_processed_total.write().await;
                *counter += value;
            }
            "redis_operations_total" => {
                let mut counter = self.redis_operations_total.write().await;
                *counter += value;
            }
            _ => {}
        }
    }
    
    /// 设置仪表值
    pub async fn set_gauge(&self, name: &str, value: f64) {
        if name == "websocket_connections" {
            let mut gauge = self.websocket_connections.write().await;
            *gauge = value;
        }
    }
    
    /// 记录直方图值
    pub async fn record_histogram(&self, name: &str, value: f64) {
        match name {
            "http_request_duration" => {
                let mut hist = self.http_request_duration.write().await;
                hist.push(value);
                // 保持最近1000个样本
                if hist.len() > 1000 {
                    hist.remove(0);
                }
            }
            "redis_operation_duration" => {
                let mut hist = self.redis_operation_duration.write().await;
                hist.push(value);
                if hist.len() > 1000 {
                    hist.remove(0);
                }
            }
            _ => {}
        }
    }
    
    /// 获取所有指标
    pub async fn get_all_metrics(&self) -> Vec<Metric> {
        let mut metrics = Vec::new();
        
        // HTTP请求总数
        metrics.push(Metric {
            name: "http_requests_total".to_string(),
            help: "Total number of HTTP requests".to_string(),
            metric_type: MetricType::Counter(*self.http_requests_total.read().await),
            labels: HashMap::new(),
            timestamp: Instant::now(),
        });
        
        // WebSocket连接数
        metrics.push(Metric {
            name: "websocket_connections".to_string(),
            help: "Current number of WebSocket connections".to_string(),
            metric_type: MetricType::Gauge(*self.websocket_connections.read().await),
            labels: HashMap::new(),
            timestamp: Instant::now(),
        });
        
        // 消息处理总数
        metrics.push(Metric {
            name: "message_processed_total".to_string(),
            help: "Total number of processed messages".to_string(),
            metric_type: MetricType::Counter(*self.message_processed_total.read().await),
            labels: HashMap::new(),
            timestamp: Instant::now(),
        });
        
        metrics
    }
}