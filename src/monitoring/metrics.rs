use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;

#[derive(Debug, Clone)]
pub enum MetricType {
    Counter,
    Gauge,
    Histogram,
}

#[derive(Debug, Clone)]
pub struct Metric {
    pub name: String,
    pub value: f64,
    pub metric_type: MetricType,
    pub timestamp: Instant,
}

/// Enterprise-grade metrics registry
#[derive(Debug)]
pub struct MetricsRegistry {
    metrics: Arc<RwLock<HashMap<String, Metric>>>,
}

impl MetricsRegistry {
    pub fn new() -> Self {
        Self {
            metrics: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn record_metric(&self, name: &str, value: f64) {
        let metric = Metric {
            name: name.to_string(),
            value,
            metric_type: MetricType::Gauge,
            timestamp: Instant::now(),
        };
        
        let mut metrics = self.metrics.write().await;
        metrics.insert(name.to_string(), metric);
    }

    pub async fn get_metric(&self, name: &str) -> Option<Metric> {
        let metrics = self.metrics.read().await;
        metrics.get(name).cloned()
    }

    pub async fn get_all_metrics(&self) -> Vec<Metric> {
        let metrics = self.metrics.read().await;
        metrics.values().cloned().collect()
    }
}

impl Default for MetricsRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl Clone for MetricsRegistry {
    fn clone(&self) -> Self {
        Self {
            metrics: Arc::clone(&self.metrics),
        }
    }
}