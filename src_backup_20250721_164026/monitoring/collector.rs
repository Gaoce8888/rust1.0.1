use std::sync::Arc;
use tokio::time::{interval, Duration};
use crate::monitoring::metrics::MetricsRegistry;
use crate::websocket::WebSocketManager;
use tracing::info;

/// 性能数据收集器
pub struct PerformanceCollector {
    metrics: Arc<MetricsRegistry>,
    ws_manager: Arc<WebSocketManager>,
}

impl PerformanceCollector {
    pub fn new(
        metrics: Arc<MetricsRegistry>,
        ws_manager: Arc<WebSocketManager>,
    ) -> Self {
        Self {
            metrics,
            ws_manager,
        }
    }
    
    /// 启动定期收集任务
    pub async fn start_collection(&self) {
        let metrics = self.metrics.clone();
        let ws_manager = self.ws_manager.clone();
        
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(10));
            
            loop {
                interval.tick().await;
                
                // 收集WebSocket连接数
                let stats = ws_manager.get_connection_stats().await;
                metrics.set_gauge("websocket_connections", stats.total_connections as f64).await;
                
                info!(
                    "Performance metrics collected: {} total connections, {} kefu, {} kehu",
                    stats.total_connections,
                    stats.kefu_connections,
                    stats.kehu_connections
                );
            }
        });
    }
}