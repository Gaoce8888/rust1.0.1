#!/bin/bash

# 修复代理模块中的函数调用
echo "修复代理模块函数调用..."

# 修复 ai_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<AiComponentGenerationRequest, AiComponentGenerationResponse>(/g' src/proxy/ai_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<SmartReplyRequest, SmartReplyResponse>(/g' src/proxy/ai_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<VoiceTranscriptionRequest, VoiceTranscriptionResponse>(/g' src/proxy/ai_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<SentimentAnalysisRequest, SentimentAnalysisResponse>(/g' src/proxy/ai_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<serde_json::Value, HashMap<String, f64>>(/g' src/proxy/ai_proxy.rs

# 修复 react_card_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<ReactCardRenderRequest, ReactCardRenderResponse>(/g' src/proxy/react_card_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<ReactCardGenerationRequest, ReactCardGenerationResponse>(/g' src/proxy/react_card_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<AdaptiveConfigRequest, AdaptiveConfigResponse>(/g' src/proxy/react_card_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<CardTemplateRequest, CardTemplateResponse>(/g' src/proxy/react_card_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<serde_json::Value, serde_json::Value>(/g' src/proxy/react_card_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<serde_json::Value, Vec<HashMap<String, serde_json::Value>>>(/g' src/proxy/react_card_proxy.rs

# 修复 analytics_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<AnalyticsEventRequest, AnalyticsEventResponse>(/g' src/proxy/analytics_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<UserBehaviorRequest, UserBehaviorResponse>(/g' src/proxy/analytics_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<MessageAnalysisRequest, MessageAnalysisResponse>(/g' src/proxy/analytics_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<RealTimeMetricsRequest, RealTimeMetricsResponse>(/g' src/proxy/analytics_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<SmartRecommendationRequest, SmartRecommendationResponse>(/g' src/proxy/analytics_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<serde_json::Value, HashMap<String, serde_json::Value>>(/g' src/proxy/analytics_proxy.rs

# 修复 enterprise_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<LoadBalancerRequest, LoadBalancerResponse>(/g' src/proxy/enterprise_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<HealthMonitorRequest, HealthMonitorResponse>(/g' src/proxy/enterprise_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<PerformanceOptimizationRequest, PerformanceOptimizationResponse>(/g' src/proxy/enterprise_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<FailoverRequest, FailoverResponse>(/g' src/proxy/enterprise_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<AutoScalingRequest, AutoScalingResponse>(/g' src/proxy/enterprise_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<HashMap<String, serde_json::Value>, HashMap<String, serde_json::Value>>(/g' src/proxy/enterprise_proxy.rs
sed -i 's/forward_to_enhanced_service(/forward_to_enhanced_service_with_response::<serde_json::Value, serde_json::Value>(/g' src/proxy/enterprise_proxy.rs

echo "函数调用修复完成"