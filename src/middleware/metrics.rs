use std::sync::Arc;
use std::time::Instant;
use warp::Filter;
use crate::monitoring::MetricsRegistry;
use tokio;

/// 性能监控中间件
pub fn with_metrics(
    metrics: Arc<MetricsRegistry>,
) -> impl Filter<Extract = (Arc<MetricsRegistry>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || metrics.clone())
}

/// 请求计时中间件
pub fn request_timer<F>(
    filter: F,
    metrics: Arc<MetricsRegistry>,
) -> impl Filter<Extract = F::Extract, Error = F::Error> + Clone
where
    F: Filter + Clone,
{
    warp::any()
        .map(move || {
            let start = Instant::now();
            let metrics = metrics.clone();
            (start, metrics)
        })
        .and(filter)
        .map(move |(start, metrics): (Instant, Arc<MetricsRegistry>), response| {
            let duration = start.elapsed().as_secs_f64() * 1000.0; // 转换为毫秒
            
            // 异步记录指标
            tokio::spawn(async move {
                metrics.increment_counter("http_requests_total", 1.0).await;
                metrics.record_histogram("http_request_duration", duration).await;
            });
            
            response
        })
}