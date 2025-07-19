use std::sync::Arc;
use warp::Filter;
use crate::monitoring::metrics::{MetricsRegistry, MetricType};

/// Prometheus格式导出器
pub struct PrometheusExporter {
    metrics: Arc<MetricsRegistry>,
}

impl PrometheusExporter {
    pub fn new(metrics: Arc<MetricsRegistry>) -> Self {
        Self { metrics }
    }
    
    /// 创建metrics端点路由
    pub fn routes(&self) -> impl Filter<Extract = (impl warp::Reply,), Error = warp::Rejection> + Clone {
        let metrics = self.metrics.clone();
        
        warp::path("metrics")
            .and(warp::get())
            .and_then(move || {
                let metrics = metrics.clone();
                async move {
                    let output = Self::format_metrics(&metrics).await;
                    Ok::<_, warp::Rejection>(warp::reply::with_header(
                        output,
                        "Content-Type",
                        "text/plain; version=0.0.4"
                    ))
                }
            })
    }
    
    /// 格式化为Prometheus格式
    async fn format_metrics(metrics: &Arc<MetricsRegistry>) -> String {
        let mut output = String::new();
        
        for metric in metrics.get_all_metrics().await {
            // 写入HELP信息
            output.push_str(&format!("# HELP {} {}\n", metric.name, metric.help));
            
            // 写入TYPE信息
            let type_str = match &metric.metric_type {
                MetricType::Counter(_) => "counter",
                MetricType::Gauge(_) => "gauge",
                MetricType::Histogram(_) => "histogram",
                MetricType::Summary { .. } => "summary",
            };
            output.push_str(&format!("# TYPE {} {}\n", metric.name, type_str));
            
            // 写入指标值
            match &metric.metric_type {
                MetricType::Counter(value) | MetricType::Gauge(value) => {
                    output.push_str(&format!("{} {}\n", metric.name, value));
                }
                MetricType::Histogram(values) => {
                    if !values.is_empty() {
                        let count = values.len();
                        let sum: f64 = values.iter().sum();
                        output.push_str(&format!("{}_count {}\n", metric.name, count));
                        output.push_str(&format!("{}_sum {}\n", metric.name, sum));
                    }
                }
                MetricType::Summary { count, sum, .. } => {
                    output.push_str(&format!("{}_count {}\n", metric.name, count));
                    output.push_str(&format!("{}_sum {}\n", metric.name, sum));
                }
            }
        }
        
        output
    }
}