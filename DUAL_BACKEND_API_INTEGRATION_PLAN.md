# 双REST后端API互通方案

## 方案概述

### 问题分析
当前系统禁用了以下功能模块：
- **AI功能模块** (0% 可用) - 完全禁用，已备份
- **React卡片系统** (0% 可用) - 完全禁用，已备份  
- **数据分析系统** (0% 可用) - 完全禁用，已备份
- **企业级功能** (0% 可用) - 完全禁用，已备份

### 解决方案
通过双REST后端架构，将禁用功能独立部署为微服务，通过API互通实现功能恢复。

---

## 🏗️ 架构设计

### 整体架构图
```
┌─────────────────┐    HTTP/HTTPS    ┌─────────────────┐
│   前端应用      │ ◄──────────────► │   主后端服务    │
│  (React)        │                  │  (Core Backend) │
└─────────────────┘                  └─────────────────┘
                                              │
                                              │ API调用
                                              ▼
                                    ┌─────────────────┐
                                    │   增强后端服务  │
                                    │ (Enhanced API)  │
                                    └─────────────────┘
```

### 服务拆分策略

#### 主后端服务 (Core Backend)
**职责**: 核心业务功能
- 用户认证系统
- 消息通信系统
- 用户管理系统
- 文件管理系统
- 会话管理系统
- 数据存储系统

#### 增强后端服务 (Enhanced Backend)
**职责**: 增强功能模块
- AI功能模块
- React卡片系统
- 数据分析系统
- 企业级功能

---

## 🔧 技术实现方案

### 1. API网关设计

#### 主后端API网关
```rust
// src/api_gateway.rs
use warp::Filter;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiRequest<T> {
    pub service: String,
    pub endpoint: String,
    pub data: T,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub timestamp: i64,
}

pub async fn forward_to_enhanced_service<T: Serialize + for<'de> Deserialize<'de>>(
    request: ApiRequest<T>,
    enhanced_service_url: String,
) -> Result<ApiResponse<T>, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    
    let response = client
        .post(&format!("{}/api/v1/{}", enhanced_service_url, request.endpoint))
        .json(&request)
        .send()
        .await?;
    
    let api_response: ApiResponse<T> = response.json().await?;
    Ok(api_response)
}
```

#### 增强后端API网关
```rust
// enhanced_backend/src/api_gateway.rs
use warp::Filter;
use serde::{Deserialize, Serialize};

pub async fn handle_ai_request(
    request: ApiRequest<AiRequest>,
) -> Result<ApiResponse<AiResponse>, Box<dyn std::error::Error>> {
    match request.endpoint.as_str() {
        "ai/generate-component" => handle_component_generation(request.data).await,
        "ai/smart-reply" => handle_smart_reply(request.data).await,
        "ai/voice-transcription" => handle_voice_transcription(request.data).await,
        _ => Err("Unknown AI endpoint".into()),
    }
}

pub async fn handle_react_card_request(
    request: ApiRequest<ReactCardRequest>,
) -> Result<ApiResponse<ReactCardResponse>, Box<dyn std::error::Error>> {
    match request.endpoint.as_str() {
        "react-card/render" => handle_card_rendering(request.data).await,
        "react-card/generate" => handle_card_generation(request.data).await,
        "react-card/adaptive-config" => handle_adaptive_config(request.data).await,
        _ => Err("Unknown React Card endpoint".into()),
    }
}
```

### 2. 服务发现和配置

#### 配置管理
```rust
// src/config/enhanced_services.rs
#[derive(Debug, Clone)]
pub struct EnhancedServiceConfig {
    pub ai_service_url: String,
    pub react_card_service_url: String,
    pub analytics_service_url: String,
    pub enterprise_service_url: String,
    pub timeout_seconds: u64,
    pub retry_attempts: u32,
}

impl Default for EnhancedServiceConfig {
    fn default() -> Self {
        Self {
            ai_service_url: "http://localhost:8081".to_string(),
            react_card_service_url: "http://localhost:8082".to_string(),
            analytics_service_url: "http://localhost:8083".to_string(),
            enterprise_service_url: "http://localhost:8084".to_string(),
            timeout_seconds: 30,
            retry_attempts: 3,
        }
    }
}
```

#### 服务健康检查
```rust
// src/health/enhanced_services.rs
use tokio::time::{timeout, Duration};

pub async fn check_enhanced_service_health(
    service_url: &str,
    timeout_duration: Duration,
) -> bool {
    let client = reqwest::Client::new();
    
    match timeout(
        timeout_duration,
        client.get(&format!("{}/health", service_url)).send()
    ).await {
        Ok(Ok(response)) => response.status().is_success(),
        _ => false,
    }
}

pub async fn monitor_all_enhanced_services(
    config: &EnhancedServiceConfig,
) -> HashMap<String, bool> {
    let mut health_status = HashMap::new();
    
    let services = vec![
        ("ai", config.ai_service_url.clone()),
        ("react-card", config.react_card_service_url.clone()),
        ("analytics", config.analytics_service_url.clone()),
        ("enterprise", config.enterprise_service_url.clone()),
    ];
    
    for (name, url) in services {
        let is_healthy = check_enhanced_service_health(
            &url,
            Duration::from_secs(config.timeout_seconds)
        ).await;
        health_status.insert(name.to_string(), is_healthy);
    }
    
    health_status
}
```

### 3. 错误处理和降级策略

#### 降级策略实现
```rust
// src/fallback/enhanced_services.rs
use std::collections::HashMap;

#[derive(Debug)]
pub enum FallbackStrategy {
    UseCache,
    UseDefaultResponse,
    DisableFeature,
    RetryWithBackup,
}

pub struct EnhancedServiceFallback {
    strategies: HashMap<String, FallbackStrategy>,
    cache: Arc<RwLock<HashMap<String, Vec<u8>>>>,
}

impl EnhancedServiceFallback {
    pub async fn handle_service_failure<T>(
        &self,
        service_name: &str,
        request: ApiRequest<T>,
    ) -> Result<ApiResponse<T>, Box<dyn std::error::Error>> {
        let strategy = self.strategies.get(service_name)
            .unwrap_or(&FallbackStrategy::DisableFeature);
        
        match strategy {
            FallbackStrategy::UseCache => self.handle_with_cache(service_name, &request).await,
            FallbackStrategy::UseDefaultResponse => self.handle_with_default(service_name).await,
            FallbackStrategy::DisableFeature => self.handle_disable_feature(service_name).await,
            FallbackStrategy::RetryWithBackup => self.handle_with_backup(service_name, request).await,
        }
    }
    
    async fn handle_with_cache<T>(
        &self,
        service_name: &str,
        request: &ApiRequest<T>,
    ) -> Result<ApiResponse<T>, Box<dyn std::error::Error>> {
        let cache_key = format!("{}:{}", service_name, request.endpoint);
        let cache = self.cache.read().await;
        
        if let Some(cached_data) = cache.get(&cache_key) {
            // 返回缓存数据
            Ok(ApiResponse {
                success: true,
                data: Some(serde_json::from_slice(cached_data)?),
                error: None,
                timestamp: chrono::Utc::now().timestamp(),
            })
        } else {
            self.handle_disable_feature(service_name).await
        }
    }
    
    async fn handle_disable_feature<T>(
        &self,
        service_name: &str,
    ) -> Result<ApiResponse<T>, Box<dyn std::error::Error>> {
        Ok(ApiResponse {
            success: false,
            data: None,
            error: Some(format!("{} service is temporarily unavailable", service_name)),
            timestamp: chrono::Utc::now().timestamp(),
        })
    }
}
```

---

## 🚀 具体功能实现

### 1. AI功能模块集成

#### 主后端AI代理
```rust
// src/proxy/ai_proxy.rs
use crate::api_gateway::{ApiRequest, ApiResponse};

#[derive(Debug, Serialize, Deserialize)]
pub struct AiComponentGenerationRequest {
    pub prompt: String,
    pub component_type: String,
    pub style_config: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiComponentGenerationResponse {
    pub component_code: String,
    pub component_config: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, serde_json::Value>,
}

pub async fn generate_ai_component(
    request: AiComponentGenerationRequest,
    config: &EnhancedServiceConfig,
) -> Result<AiComponentGenerationResponse, Box<dyn std::error::Error>> {
    let api_request = ApiRequest {
        service: "ai".to_string(),
        endpoint: "generate-component".to_string(),
        data: request,
        timestamp: chrono::Utc::now().timestamp(),
    };
    
    let response: ApiResponse<AiComponentGenerationResponse> = 
        forward_to_enhanced_service(api_request, config.ai_service_url.clone()).await?;
    
    if response.success {
        Ok(response.data.unwrap())
    } else {
        Err(response.error.unwrap_or("AI service error".to_string()).into())
    }
}

pub async fn get_smart_reply(
    message: String,
    context: HashMap<String, serde_json::Value>,
    config: &EnhancedServiceConfig,
) -> Result<String, Box<dyn std::error::Error>> {
    let request = ApiRequest {
        service: "ai".to_string(),
        endpoint: "smart-reply".to_string(),
        data: serde_json::json!({
            "message": message,
            "context": context,
        }),
        timestamp: chrono::Utc::now().timestamp(),
    };
    
    let response: ApiResponse<serde_json::Value> = 
        forward_to_enhanced_service(request, config.ai_service_url.clone()).await?;
    
    if response.success {
        Ok(response.data.unwrap()["reply"].as_str().unwrap().to_string())
    } else {
        Err(response.error.unwrap_or("AI service error".to_string()).into())
    }
}
```

#### 增强后端AI服务
```rust
// enhanced_backend/src/services/ai_service.rs
use openai_api_rust::*;

pub struct AiService {
    openai_client: OpenAI,
    model_config: AiModelConfig,
}

impl AiService {
    pub async fn generate_component(
        &self,
        request: AiComponentGenerationRequest,
    ) -> Result<AiComponentGenerationResponse, Box<dyn std::error::Error>> {
        let prompt = format!(
            "Generate a React component based on: {}",
            request.prompt
        );
        
        let response = self.openai_client
            .chat_completion_create(&ChatBody {
                model: self.model_config.model.clone(),
                messages: vec![
                    Message {
                        role: Role::System,
                        content: "You are a React component generator.".to_string(),
                    },
                    Message {
                        role: Role::User,
                        content: prompt,
                    },
                ],
                max_tokens: Some(2000),
                temperature: Some(0.7),
                ..Default::default()
            })
            .await?;
        
        let component_code = response.choices[0].message.content.clone();
        
        Ok(AiComponentGenerationResponse {
            component_code,
            component_config: request.style_config,
            metadata: HashMap::new(),
        })
    }
    
    pub async fn generate_smart_reply(
        &self,
        message: &str,
        context: &HashMap<String, serde_json::Value>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let context_str = serde_json::to_string(context)?;
        let prompt = format!(
            "Generate a smart reply for customer service message: '{}' with context: {}",
            message, context_str
        );
        
        let response = self.openai_client
            .chat_completion_create(&ChatBody {
                model: self.model_config.model.clone(),
                messages: vec![
                    Message {
                        role: Role::System,
                        content: "You are a helpful customer service assistant.".to_string(),
                    },
                    Message {
                        role: Role::User,
                        content: prompt,
                    },
                ],
                max_tokens: Some(500),
                temperature: Some(0.5),
                ..Default::default()
            })
            .await?;
        
        Ok(response.choices[0].message.content.clone())
    }
}
```

### 2. React卡片系统集成

#### 主后端React卡片代理
```rust
// src/proxy/react_card_proxy.rs
#[derive(Debug, Serialize, Deserialize)]
pub struct ReactCardRenderRequest {
    pub component_data: HashMap<String, serde_json::Value>,
    pub adaptive_styles: HashMap<String, String>,
    pub container_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReactCardRenderResponse {
    pub rendered_html: String,
    pub component_script: String,
    pub styles: String,
}

pub async fn render_react_card(
    request: ReactCardRenderRequest,
    config: &EnhancedServiceConfig,
) -> Result<ReactCardRenderResponse, Box<dyn std::error::Error>> {
    let api_request = ApiRequest {
        service: "react-card".to_string(),
        endpoint: "render".to_string(),
        data: request,
        timestamp: chrono::Utc::now().timestamp(),
    };
    
    let response: ApiResponse<ReactCardRenderResponse> = 
        forward_to_enhanced_service(api_request, config.react_card_service_url.clone()).await?;
    
    if response.success {
        Ok(response.data.unwrap())
    } else {
        Err(response.error.unwrap_or("React Card service error".to_string()).into())
    }
}
```

#### 增强后端React卡片服务
```rust
// enhanced_backend/src/services/react_card_service.rs
use serde_json::Value;

pub struct ReactCardService {
    template_engine: TemplateEngine,
    style_generator: StyleGenerator,
}

impl ReactCardService {
    pub async fn render_card(
        &self,
        request: ReactCardRenderRequest,
    ) -> Result<ReactCardRenderResponse, Box<dyn std::error::Error>> {
        // 生成React组件代码
        let component_code = self.generate_component_code(&request.component_data)?;
        
        // 生成自适应样式
        let styles = self.generate_adaptive_styles(&request.adaptive_styles)?;
        
        // 生成HTML包装器
        let html_wrapper = self.generate_html_wrapper(
            &request.container_id,
            &component_code,
            &styles,
        )?;
        
        Ok(ReactCardRenderResponse {
            rendered_html: html_wrapper,
            component_script: component_code,
            styles,
        })
    }
    
    fn generate_component_code(
        &self,
        component_data: &HashMap<String, Value>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let mut code = String::new();
        code.push_str("import React from 'react';\n");
        code.push_str("import { Card, Button, Image } from '@heroui/react';\n\n");
        
        if let Some(card_type) = component_data.get("type") {
            match card_type.as_str() {
                Some("product") => {
                    code.push_str(&self.generate_product_card(component_data)?);
                }
                Some("info") => {
                    code.push_str(&self.generate_info_card(component_data)?);
                }
                _ => {
                    code.push_str(&self.generate_custom_card(component_data)?);
                }
            }
        }
        
        Ok(code)
    }
    
    fn generate_adaptive_styles(
        &self,
        adaptive_config: &HashMap<String, String>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let mut styles = String::new();
        styles.push_str("<style>\n");
        
        for (selector, properties) in adaptive_config {
            styles.push_str(&format!("{} {{\n", selector));
            styles.push_str(&format!("  {}\n", properties));
            styles.push_str("}\n");
        }
        
        styles.push_str("</style>");
        Ok(styles)
    }
}
```

### 3. 数据分析系统集成

#### 主后端数据分析代理
```rust
// src/proxy/analytics_proxy.rs
#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsRequest {
    pub event_type: String,
    pub user_id: String,
    pub data: HashMap<String, serde_json::Value>,
    pub timestamp: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsResponse {
    pub insights: HashMap<String, serde_json::Value>,
    pub recommendations: Vec<String>,
    pub metrics: HashMap<String, f64>,
}

pub async fn track_analytics_event(
    request: AnalyticsRequest,
    config: &EnhancedServiceConfig,
) -> Result<AnalyticsResponse, Box<dyn std::error::Error>> {
    let api_request = ApiRequest {
        service: "analytics".to_string(),
        endpoint: "track-event".to_string(),
        data: request,
        timestamp: chrono::Utc::now().timestamp(),
    };
    
    let response: ApiResponse<AnalyticsResponse> = 
        forward_to_enhanced_service(api_request, config.analytics_service_url.clone()).await?;
    
    if response.success {
        Ok(response.data.unwrap())
    } else {
        Err(response.error.unwrap_or("Analytics service error".to_string()).into())
    }
}
```

#### 增强后端数据分析服务
```rust
// enhanced_backend/src/services/analytics_service.rs
use std::collections::HashMap;

pub struct AnalyticsService {
    event_store: EventStore,
    metrics_calculator: MetricsCalculator,
    insight_generator: InsightGenerator,
}

impl AnalyticsService {
    pub async fn track_event(
        &self,
        request: AnalyticsRequest,
    ) -> Result<AnalyticsResponse, Box<dyn std::error::Error>> {
        // 存储事件数据
        self.event_store.store_event(&request).await?;
        
        // 计算实时指标
        let metrics = self.metrics_calculator.calculate_metrics(&request).await?;
        
        // 生成洞察
        let insights = self.insight_generator.generate_insights(&request).await?;
        
        // 生成推荐
        let recommendations = self.generate_recommendations(&request, &insights).await?;
        
        Ok(AnalyticsResponse {
            insights,
            recommendations,
            metrics,
        })
    }
    
    async fn generate_recommendations(
        &self,
        request: &AnalyticsRequest,
        insights: &HashMap<String, Value>,
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let mut recommendations = Vec::new();
        
        // 基于事件类型生成推荐
        match request.event_type.as_str() {
            "message_sent" => {
                if let Some(response_time) = insights.get("avg_response_time") {
                    if response_time.as_f64().unwrap_or(0.0) > 300.0 {
                        recommendations.push("考虑增加客服人员以提高响应速度".to_string());
                    }
                }
            }
            "session_started" => {
                if let Some(session_duration) = insights.get("avg_session_duration") {
                    if session_duration.as_f64().unwrap_or(0.0) < 60.0 {
                        recommendations.push("会话时间较短，建议优化客服培训".to_string());
                    }
                }
            }
            _ => {}
        }
        
        Ok(recommendations)
    }
}
```

### 4. 企业级功能集成

#### 主后端企业级功能代理
```rust
// src/proxy/enterprise_proxy.rs
#[derive(Debug, Serialize, Deserialize)]
pub struct LoadBalancerRequest {
    pub service_type: String,
    pub current_load: f64,
    pub health_status: HashMap<String, bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoadBalancerResponse {
    pub target_service: String,
    pub routing_strategy: String,
    pub health_check_result: HashMap<String, bool>,
}

pub async fn get_load_balancer_decision(
    request: LoadBalancerRequest,
    config: &EnhancedServiceConfig,
) -> Result<LoadBalancerResponse, Box<dyn std::error::Error>> {
    let api_request = ApiRequest {
        service: "enterprise".to_string(),
        endpoint: "load-balancer".to_string(),
        data: request,
        timestamp: chrono::Utc::now().timestamp(),
    };
    
    let response: ApiResponse<LoadBalancerResponse> = 
        forward_to_enhanced_service(api_request, config.enterprise_service_url.clone()).await?;
    
    if response.success {
        Ok(response.data.unwrap())
    } else {
        Err(response.error.unwrap_or("Enterprise service error".to_string()).into())
    }
}
```

#### 增强后端企业级服务
```rust
// enhanced_backend/src/services/enterprise_service.rs
pub struct EnterpriseService {
    load_balancer: LoadBalancer,
    health_monitor: HealthMonitor,
    performance_optimizer: PerformanceOptimizer,
}

impl EnterpriseService {
    pub async fn handle_load_balancing(
        &self,
        request: LoadBalancerRequest,
    ) -> Result<LoadBalancerResponse, Box<dyn std::error::Error>> {
        // 执行健康检查
        let health_status = self.health_monitor.check_all_services().await?;
        
        // 获取负载均衡决策
        let target_service = self.load_balancer.select_service(
            &request.service_type,
            request.current_load,
            &health_status,
        ).await?;
        
        // 确定路由策略
        let routing_strategy = self.load_balancer.get_routing_strategy(&target_service).await?;
        
        Ok(LoadBalancerResponse {
            target_service,
            routing_strategy,
            health_check_result: health_status,
        })
    }
    
    pub async fn optimize_performance(
        &self,
        service_name: &str,
        current_metrics: &HashMap<String, f64>,
    ) -> Result<HashMap<String, f64>, Box<dyn std::error::Error>> {
        self.performance_optimizer.optimize(service_name, current_metrics).await
    }
}
```

---

## 🔄 前端集成方案

### 1. 前端API客户端

```javascript
// frontend/kefu-app/src/utils/enhancedApiClient.js
class EnhancedApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.cache = new Map();
        this.retryAttempts = 3;
    }
    
    async request(endpoint, data, options = {}) {
        const requestData = {
            service: options.service || 'core',
            endpoint,
            data,
            timestamp: Date.now(),
        };
        
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            
            // 尝试降级处理
            return this.handleFallback(endpoint, data, error);
        }
    }
    
    async handleFallback(endpoint, data, error) {
        // 检查缓存
        const cacheKey = `${endpoint}:${JSON.stringify(data)}`;
        if (this.cache.has(cacheKey)) {
            console.log(`Using cached data for ${endpoint}`);
            return this.cache.get(cacheKey);
        }
        
        // 返回默认响应
        return this.getDefaultResponse(endpoint);
    }
    
    getDefaultResponse(endpoint) {
        const defaults = {
            'ai/generate-component': {
                component_code: '// Component generation temporarily unavailable',
                component_config: {},
                metadata: {},
            },
            'react-card/render': {
                rendered_html: '<div>Card rendering temporarily unavailable</div>',
                component_script: '',
                styles: '',
            },
            'analytics/track-event': {
                insights: {},
                recommendations: [],
                metrics: {},
            },
        };
        
        return defaults[endpoint] || null;
    }
    
    // AI功能
    async generateAiComponent(prompt, componentType, styleConfig) {
        return this.request('ai/generate-component', {
            prompt,
            component_type: componentType,
            style_config: styleConfig,
        }, { service: 'ai' });
    }
    
    async getSmartReply(message, context) {
        return this.request('ai/smart-reply', {
            message,
            context,
        }, { service: 'ai' });
    }
    
    // React卡片功能
    async renderReactCard(componentData, adaptiveStyles, containerId) {
        return this.request('react-card/render', {
            component_data: componentData,
            adaptive_styles: adaptiveStyles,
            container_id: containerId,
        }, { service: 'react-card' });
    }
    
    // 数据分析功能
    async trackAnalyticsEvent(eventType, userId, data) {
        return this.request('analytics/track-event', {
            event_type: eventType,
            user_id: userId,
            data,
            timestamp: Date.now(),
        }, { service: 'analytics' });
    }
}

export const enhancedApiClient = new EnhancedApiClient(process.env.REACT_APP_API_BASE_URL);
```

### 2. 前端组件集成

```javascript
// frontend/kefu-app/src/components/AIComponentGenerator.jsx
import React, { useState, useEffect } from 'react';
import { enhancedApiClient } from '../utils/enhancedApiClient';

const AIComponentGenerator = ({ isOpen, onClose, onComponentGenerated }) => {
    const [prompt, setPrompt] = useState('');
    const [componentType, setComponentType] = useState('product');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);
    
    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        
        setIsGenerating(true);
        setError(null);
        
        try {
            const result = await enhancedApiClient.generateAiComponent(
                prompt,
                componentType,
                {}
            );
            
            if (result) {
                onComponentGenerated(result);
                onClose();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
                <ModalHeader>AI组件生成器</ModalHeader>
                <ModalBody>
                    <Textarea
                        label="描述你想要的组件"
                        placeholder="例如：一个产品展示卡片，包含图片、标题、价格和购买按钮"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <Select
                        label="组件类型"
                        value={componentType}
                        onChange={(e) => setComponentType(e.target.value)}
                    >
                        <SelectItem key="product">产品卡片</SelectItem>
                        <SelectItem key="info">信息卡片</SelectItem>
                        <SelectItem key="custom">自定义卡片</SelectItem>
                    </Select>
                    {error && (
                        <Alert color="danger">
                            {error}
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="light" onPress={onClose}>
                        取消
                    </Button>
                    <Button
                        color="primary"
                        onPress={handleGenerate}
                        isLoading={isGenerating}
                    >
                        生成组件
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default AIComponentGenerator;
```

---

## 📋 部署方案

### 1. Docker Compose配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 主后端服务
  core-backend:
    build: ./core-backend
    ports:
      - "8080:8080"
    environment:
      - ENHANCED_AI_SERVICE_URL=http://ai-service:8081
      - ENHANCED_REACT_CARD_SERVICE_URL=http://react-card-service:8082
      - ENHANCED_ANALYTICS_SERVICE_URL=http://analytics-service:8083
      - ENHANCED_ENTERPRISE_SERVICE_URL=http://enterprise-service:8084
    depends_on:
      - redis
      - postgres
    networks:
      - kefu-network

  # AI服务
  ai-service:
    build: ./enhanced-backend/ai-service
    ports:
      - "8081:8081"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - MODEL_CONFIG_PATH=/app/config/model.json
    networks:
      - kefu-network

  # React卡片服务
  react-card-service:
    build: ./enhanced-backend/react-card-service
    ports:
      - "8082:8082"
    environment:
      - TEMPLATE_ENGINE_CONFIG_PATH=/app/config/templates.json
    networks:
      - kefu-network

  # 数据分析服务
  analytics-service:
    build: ./enhanced-backend/analytics-service
    ports:
      - "8083:8083"
    environment:
      - DATABASE_URL=${ANALYTICS_DATABASE_URL}
      - REDIS_URL=${ANALYTICS_REDIS_URL}
    depends_on:
      - analytics-db
      - analytics-redis
    networks:
      - kefu-network

  # 企业级服务
  enterprise-service:
    build: ./enhanced-backend/enterprise-service
    ports:
      - "8084:8084"
    environment:
      - LOAD_BALANCER_CONFIG_PATH=/app/config/load-balancer.json
      - HEALTH_CHECK_INTERVAL=30
    networks:
      - kefu-network

  # 前端应用
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_BASE_URL=http://localhost:8080
    depends_on:
      - core-backend
    networks:
      - kefu-network

  # 数据库服务
  postgres:
    image: postgres:13
    environment:
      - POSTGRES_DB=kefu_core
      - POSTGRES_USER=kefu_user
      - POSTGRES_PASSWORD=kefu_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - kefu-network

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    networks:
      - kefu-network

  analytics-db:
    image: postgres:13
    environment:
      - POSTGRES_DB=kefu_analytics
      - POSTGRES_USER=analytics_user
      - POSTGRES_PASSWORD=analytics_password
    volumes:
      - analytics_data:/var/lib/postgresql/data
    networks:
      - kefu-network

  analytics-redis:
    image: redis:6-alpine
    networks:
      - kefu-network

volumes:
  postgres_data:
  analytics_data:

networks:
  kefu-network:
    driver: bridge
```

### 2. 服务监控

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'core-backend'
    static_configs:
      - targets: ['core-backend:8080']

  - job_name: 'ai-service'
    static_configs:
      - targets: ['ai-service:8081']

  - job_name: 'react-card-service'
    static_configs:
      - targets: ['react-card-service:8082']

  - job_name: 'analytics-service'
    static_configs:
      - targets: ['analytics-service:8083']

  - job_name: 'enterprise-service'
    static_configs:
      - targets: ['enterprise-service:8084']
```

---

## 🔄 迁移步骤

### 阶段1: 准备阶段 (1-2天)
1. **创建增强后端项目结构**
2. **设置API网关和代理**
3. **配置服务发现和健康检查**
4. **实现错误处理和降级策略**

### 阶段2: 服务迁移 (3-5天)
1. **迁移AI功能到独立服务**
2. **迁移React卡片功能到独立服务**
3. **迁移数据分析功能到独立服务**
4. **迁移企业级功能到独立服务**

### 阶段3: 集成测试 (2-3天)
1. **测试API互通功能**
2. **测试错误处理和降级**
3. **测试性能和负载**
4. **测试前端集成**

### 阶段4: 部署上线 (1-2天)
1. **配置生产环境**
2. **部署所有服务**
3. **配置监控和日志**
4. **进行最终测试**

---

## 📊 预期效果

### 功能恢复
- **AI功能**: 100% 可用
- **React卡片系统**: 100% 可用
- **数据分析系统**: 100% 可用
- **企业级功能**: 100% 可用

### 性能提升
- **模块化部署**: 独立扩展各服务
- **负载均衡**: 智能路由和负载分配
- **缓存优化**: 多层缓存策略
- **监控完善**: 全面的服务监控

### 可维护性
- **服务解耦**: 独立开发和部署
- **技术栈灵活**: 各服务可使用最适合的技术
- **故障隔离**: 单个服务故障不影响整体
- **扩展性强**: 易于添加新功能

---

*方案生成时间: 2025-07-21*
*建议: 按阶段逐步实施，确保每个阶段都经过充分测试*