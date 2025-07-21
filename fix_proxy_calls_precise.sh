#!/bin/bash

# 精确修复代理模块中的函数调用
echo "精确修复代理模块函数调用..."

# 修复 ai_proxy.rs - 逐个函数修复
sed -i 's/forward_to_enhanced_service_with_response::<AiComponentGenerationRequest, AiComponentGenerationResponse>(/forward_to_enhanced_service_with_response::<SmartReplyRequest, SmartReplyResponse>(/g' src/proxy/ai_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<SmartReplyRequest, SmartReplyResponse>(/forward_to_enhanced_service_with_response::<VoiceTranscriptionRequest, VoiceTranscriptionResponse>(/g' src/proxy/ai_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<VoiceTranscriptionRequest, VoiceTranscriptionResponse>(/forward_to_enhanced_service_with_response::<SentimentAnalysisRequest, SentimentAnalysisResponse>(/g' src/proxy/ai_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<SentimentAnalysisRequest, SentimentAnalysisResponse>(/forward_to_enhanced_service_with_response::<serde_json::Value, HashMap<String, f64>>(/g' src/proxy/ai_proxy.rs

# 修复 react_card_proxy.rs - 逐个函数修复
sed -i 's/forward_to_enhanced_service_with_response::<ReactCardRenderRequest, ReactCardRenderResponse>(/forward_to_enhanced_service_with_response::<ReactCardGenerationRequest, ReactCardGenerationResponse>(/g' src/proxy/react_card_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<ReactCardGenerationRequest, ReactCardGenerationResponse>(/forward_to_enhanced_service_with_response::<AdaptiveConfigRequest, AdaptiveConfigResponse>(/g' src/proxy/react_card_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<AdaptiveConfigRequest, AdaptiveConfigResponse>(/forward_to_enhanced_service_with_response::<CardTemplateRequest, CardTemplateResponse>(/g' src/proxy/react_card_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<CardTemplateRequest, CardTemplateResponse>(/forward_to_enhanced_service_with_response::<serde_json::Value, serde_json::Value>(/g' src/proxy/react_card_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<serde_json::Value, serde_json::Value>(/forward_to_enhanced_service_with_response::<serde_json::Value, Vec<HashMap<String, serde_json::Value>>>(/g' src/proxy/react_card_proxy.rs

# 修复 analytics_proxy.rs - 逐个函数修复
sed -i 's/forward_to_enhanced_service_with_response::<AnalyticsEventRequest, AnalyticsEventResponse>(/forward_to_enhanced_service_with_response::<UserBehaviorRequest, UserBehaviorResponse>(/g' src/proxy/analytics_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<UserBehaviorRequest, UserBehaviorResponse>(/forward_to_enhanced_service_with_response::<MessageAnalysisRequest, MessageAnalysisResponse>(/g' src/proxy/analytics_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<MessageAnalysisRequest, MessageAnalysisResponse>(/forward_to_enhanced_service_with_response::<RealTimeMetricsRequest, RealTimeMetricsResponse>(/g' src/proxy/analytics_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<RealTimeMetricsRequest, RealTimeMetricsResponse>(/forward_to_enhanced_service_with_response::<SmartRecommendationRequest, SmartRecommendationResponse>(/g' src/proxy/analytics_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<SmartRecommendationRequest, SmartRecommendationResponse>(/forward_to_enhanced_service_with_response::<serde_json::Value, HashMap<String, serde_json::Value>>(/g' src/proxy/analytics_proxy.rs

# 修复 enterprise_proxy.rs - 逐个函数修复
sed -i 's/forward_to_enhanced_service_with_response::<LoadBalancerRequest, LoadBalancerResponse>(/forward_to_enhanced_service_with_response::<HealthMonitorRequest, HealthMonitorResponse>(/g' src/proxy/enterprise_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<HealthMonitorRequest, HealthMonitorResponse>(/forward_to_enhanced_service_with_response::<PerformanceOptimizationRequest, PerformanceOptimizationResponse>(/g' src/proxy/enterprise_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<PerformanceOptimizationRequest, PerformanceOptimizationResponse>(/forward_to_enhanced_service_with_response::<FailoverRequest, FailoverResponse>(/g' src/proxy/enterprise_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<FailoverRequest, FailoverResponse>(/forward_to_enhanced_service_with_response::<AutoScalingRequest, AutoScalingResponse>(/g' src/proxy/enterprise_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<AutoScalingRequest, AutoScalingResponse>(/forward_to_enhanced_service_with_response::<HashMap<String, serde_json::Value>, HashMap<String, serde_json::Value>>(/g' src/proxy/enterprise_proxy.rs
sed -i 's/forward_to_enhanced_service_with_response::<HashMap<String, serde_json::Value>, HashMap<String, serde_json::Value>>(/forward_to_enhanced_service_with_response::<serde_json::Value, serde_json::Value>(/g' src/proxy/enterprise_proxy.rs

echo "精确函数调用修复完成"