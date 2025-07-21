/**
 * 增强API客户端
 * 用于与双REST后端架构通信
 */
class EnhancedApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.cache = new Map();
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1秒
    }
    
    /**
     * 通用请求方法
     */
    async request(endpoint, data, options = {}) {
        const requestData = {
            service: options.service || 'core',
            endpoint,
            data,
            timestamp: Date.now(),
        };
        
        let lastError;
        
        for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
            try {
                const response = await fetch(`${this.baseUrl}/api/v1/${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': options.token ? `Bearer ${options.token}` : '',
                    },
                    body: JSON.stringify(requestData),
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    // 缓存成功的响应
                    const cacheKey = `${endpoint}:${JSON.stringify(data)}`;
                    this.cache.set(cacheKey, result.data);
                    
                    return result.data;
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (error) {
                lastError = error;
                console.warn(`API request failed for ${endpoint} (attempt ${attempt + 1}):`, error);
                
                if (attempt < this.retryAttempts - 1) {
                    await this.delay(this.retryDelay * Math.pow(2, attempt)); // 指数退避
                }
            }
        }
        
        // 所有重试都失败了，尝试降级处理
        console.error(`All retry attempts failed for ${endpoint}:`, lastError);
        return this.handleFallback(endpoint, data, lastError);
    }
    
    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 降级处理
     */
    async handleFallback(endpoint, data, error) {
        console.log(`Attempting fallback for ${endpoint}`);
        
        // 检查缓存
        const cacheKey = `${endpoint}:${JSON.stringify(data)}`;
        if (this.cache.has(cacheKey)) {
            console.log(`Using cached data for ${endpoint}`);
            return this.cache.get(cacheKey);
        }
        
        // 返回默认响应
        return this.getDefaultResponse(endpoint);
    }
    
    /**
     * 获取默认响应
     */
    getDefaultResponse(endpoint) {
        const defaults = {
            'ai/generate-component': {
                component_code: '// Component generation temporarily unavailable',
                component_config: {},
                metadata: {},
            },
            'ai/smart-reply': {
                reply: '抱歉，智能回复功能暂时不可用，请稍后再试。',
                confidence: 0.0,
                suggestions: ['请稍后再试', '联系人工客服'],
            },
            'react-card/render': {
                rendered_html: '<div class="card-unavailable">卡片渲染暂时不可用</div>',
                component_script: '',
                styles: '',
            },
            'analytics/track-event': {
                insights: {},
                recommendations: [],
                metrics: {},
            },
            'enterprise/load-balancer': {
                target_service: 'primary',
                routing_strategy: 'fallback',
                health_check_result: {},
            },
        };
        
        return defaults[endpoint] || null;
    }
    
    // ==================== AI功能 ====================
    
    /**
     * 生成AI组件
     */
    async generateAiComponent(prompt, componentType, styleConfig = {}) {
        return this.request('ai/generate-component', {
            prompt,
            component_type: componentType,
            style_config: styleConfig,
        }, { service: 'ai' });
    }
    
    /**
     * 获取智能回复
     */
    async getSmartReply(message, context = {}) {
        return this.request('ai/smart-reply', {
            message,
            context,
        }, { service: 'ai' });
    }
    
    /**
     * 语音转录
     */
    async transcribeVoice(audioUrl, language = 'zh-CN', format = 'mp3') {
        return this.request('ai/voice-transcription', {
            audio_url: audioUrl,
            language,
            format,
        }, { service: 'ai' });
    }
    
    /**
     * 情感分析
     */
    async analyzeSentiment(text, context = null) {
        return this.request('ai/sentiment-analysis', {
            text,
            context,
        }, { service: 'ai' });
    }
    
    /**
     * 自动分类
     */
    async autoClassify(text, categories) {
        return this.request('ai/auto-classify', {
            text,
            categories,
        }, { service: 'ai' });
    }
    
    // ==================== React卡片功能 ====================
    
    /**
     * 渲染React卡片
     */
    async renderReactCard(componentData, adaptiveStyles, containerId) {
        return this.request('react-card/render', {
            component_data: componentData,
            adaptive_styles: adaptiveStyles,
            container_id: containerId,
        }, { service: 'react-card' });
    }
    
    /**
     * 生成React卡片
     */
    async generateReactCard(cardType, data, stylePreferences = {}) {
        return this.request('react-card/generate', {
            card_type: cardType,
            data,
            style_preferences: stylePreferences,
        }, { service: 'react-card' });
    }
    
    /**
     * 获取自适应配置
     */
    async getAdaptiveConfig(screenSize, deviceType, userPreferences = {}) {
        return this.request('react-card/adaptive-config', {
            screen_size: screenSize,
            device_type: deviceType,
            user_preferences: userPreferences,
        }, { service: 'react-card' });
    }
    
    /**
     * 获取卡片模板
     */
    async getCardTemplate(templateId, variables = {}) {
        return this.request('react-card/template', {
            template_id: templateId,
            variables,
        }, { service: 'react-card' });
    }
    
    /**
     * 保存卡片模板
     */
    async saveCardTemplate(templateCode, variables = {}, metadata = {}) {
        return this.request('react-card/save-template', {
            template_code: templateCode,
            variables,
            metadata,
        }, { service: 'react-card' });
    }
    
    /**
     * 获取模板列表
     */
    async getTemplateList() {
        return this.request('react-card/template-list', {}, { service: 'react-card' });
    }
    
    // ==================== 数据分析功能 ====================
    
    /**
     * 跟踪分析事件
     */
    async trackAnalyticsEvent(eventType, userId, data = {}) {
        return this.request('analytics/track-event', {
            event_type: eventType,
            user_id: userId,
            data,
            timestamp: Date.now(),
        }, { service: 'analytics' });
    }
    
    /**
     * 分析用户行为
     */
    async analyzeUserBehavior(userId, timeRange = '24h', eventTypes = []) {
        return this.request('analytics/user-behavior', {
            user_id: userId,
            time_range: timeRange,
            event_types: eventTypes,
        }, { service: 'analytics' });
    }
    
    /**
     * 分析消息统计
     */
    async analyzeMessages(timeRange = '24h', messageTypes = [], userGroups = null) {
        return this.request('analytics/message-analysis', {
            time_range: timeRange,
            message_types: messageTypes,
            user_groups: userGroups,
        }, { service: 'analytics' });
    }
    
    /**
     * 获取实时指标
     */
    async getRealTimeMetrics(metricTypes = [], timeWindow = '5m') {
        return this.request('analytics/real-time-metrics', {
            metric_types: metricTypes,
            time_window: timeWindow,
        }, { service: 'analytics' });
    }
    
    /**
     * 获取智能推荐
     */
    async getSmartRecommendations(userId, context = {}, recommendationType = 'response') {
        return this.request('analytics/smart-recommendations', {
            user_id: userId,
            context,
            recommendation_type: recommendationType,
        }, { service: 'analytics' });
    }
    
    /**
     * 生成报告
     */
    async generateReport(reportType, parameters = {}) {
        return this.request('analytics/generate-report', {
            report_type: reportType,
            parameters,
        }, { service: 'analytics' });
    }
    
    /**
     * 获取仪表板数据
     */
    async getDashboardData(dashboardId, filters = {}) {
        return this.request('analytics/dashboard-data', {
            dashboard_id: dashboardId,
            filters,
        }, { service: 'analytics' });
    }
    
    // ==================== 企业级功能 ====================
    
    /**
     * 获取负载均衡决策
     */
    async getLoadBalancerDecision(serviceType, currentLoad, healthStatus = {}) {
        return this.request('enterprise/load-balancer', {
            service_type: serviceType,
            current_load: currentLoad,
            health_status: healthStatus,
        }, { service: 'enterprise' });
    }
    
    /**
     * 监控健康状态
     */
    async monitorHealth(serviceName, checkInterval = 30, timeout = 10) {
        return this.request('enterprise/health-monitor', {
            service_name: serviceName,
            check_interval: checkInterval,
            timeout,
        }, { service: 'enterprise' });
    }
    
    /**
     * 优化性能
     */
    async optimizePerformance(serviceName, currentMetrics = {}, optimizationTarget = 'response_time') {
        return this.request('enterprise/performance-optimization', {
            service_name: serviceName,
            current_metrics: currentMetrics,
            optimization_target: optimizationTarget,
        }, { service: 'enterprise' });
    }
    
    /**
     * 处理故障转移
     */
    async handleFailover(primaryService, backupServices = [], failoverConditions = {}) {
        return this.request('enterprise/failover', {
            primary_service: primaryService,
            backup_services: backupServices,
            failover_conditions: failoverConditions,
        }, { service: 'enterprise' });
    }
    
    /**
     * 自动扩展
     */
    async autoScale(serviceName, currentInstances, targetMetrics = {}, scalingPolicy = {}) {
        return this.request('enterprise/auto-scaling', {
            service_name: serviceName,
            current_instances: currentInstances,
            target_metrics: targetMetrics,
            scaling_policy: scalingPolicy,
        }, { service: 'enterprise' });
    }
    
    /**
     * 获取系统状态
     */
    async getSystemStatus() {
        return this.request('enterprise/system-status', {}, { service: 'enterprise' });
    }
    
    /**
     * 配置告警
     */
    async configureAlerts(alertConfig = {}) {
        return this.request('enterprise/configure-alerts', alertConfig, { service: 'enterprise' });
    }
    
    /**
     * 获取性能报告
     */
    async getPerformanceReport(reportType, timeRange = '24h') {
        return this.request('enterprise/performance-report', {
            report_type: reportType,
            time_range: timeRange,
        }, { service: 'enterprise' });
    }
    
    // ==================== 工具方法 ====================
    
    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * 获取缓存大小
     */
    getCacheSize() {
        return this.cache.size;
    }
    
    /**
     * 设置重试配置
     */
    setRetryConfig(attempts, delay) {
        this.retryAttempts = attempts;
        this.retryDelay = delay;
    }
    
    /**
     * 健康检查
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return response.ok;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }
}

// 创建默认实例
const enhancedApiClient = new EnhancedApiClient(
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080'
);

export default enhancedApiClient;
export { EnhancedApiClient };