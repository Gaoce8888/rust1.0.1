pub mod ai_proxy;
pub mod react_card_proxy;
pub mod analytics_proxy;
pub mod enterprise_proxy;

pub use ai_proxy::*;
pub use react_card_proxy::*;
pub use analytics_proxy::*;
pub use enterprise_proxy::*;

/// 代理服务管理器
pub struct ProxyManager {
    pub ai_proxy: AiProxy,
    pub react_card_proxy: ReactCardProxy,
    pub analytics_proxy: AnalyticsProxy,
    pub enterprise_proxy: EnterpriseProxy,
}

impl ProxyManager {
    pub fn new(config: crate::api_gateway::EnhancedServiceConfig) -> Self {
        Self {
            ai_proxy: AiProxy::new(config.clone()),
            react_card_proxy: ReactCardProxy::new(config.clone()),
            analytics_proxy: AnalyticsProxy::new(config.clone()),
            enterprise_proxy: EnterpriseProxy::new(config),
        }
    }
}