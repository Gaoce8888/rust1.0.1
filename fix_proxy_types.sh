#!/bin/bash

# 修复代理模块中的类型注解问题
echo "修复代理模块类型注解..."

# 修复 analytics_proxy.rs
sed -i 's/let response: ApiResponse<UserBehaviorResponse> =/let response =/g' src/proxy/analytics_proxy.rs
sed -i 's/let response: ApiResponse<MessageAnalysisResponse> =/let response =/g' src/proxy/analytics_proxy.rs
sed -i 's/let response: ApiResponse<RealTimeMetricsResponse> =/let response =/g' src/proxy/analytics_proxy.rs
sed -i 's/let response: ApiResponse<SmartRecommendationResponse> =/let response =/g' src/proxy/analytics_proxy.rs
sed -i 's/let response: ApiResponse<HashMap<String, serde_json::Value>> =/let response =/g' src/proxy/analytics_proxy.rs

# 修复 enterprise_proxy.rs
sed -i 's/let response: ApiResponse<HealthMonitorResponse> =/let response =/g' src/proxy/enterprise_proxy.rs
sed -i 's/let response: ApiResponse<PerformanceOptimizationResponse> =/let response =/g' src/proxy/enterprise_proxy.rs
sed -i 's/let response: ApiResponse<FailoverResponse> =/let response =/g' src/proxy/enterprise_proxy.rs
sed -i 's/let response: ApiResponse<AutoScalingResponse> =/let response =/g' src/proxy/enterprise_proxy.rs
sed -i 's/let response: ApiResponse<HashMap<String, serde_json::Value>> =/let response =/g' src/proxy/enterprise_proxy.rs
sed -i 's/let response: ApiResponse<serde_json::Value> =/let response =/g' src/proxy/enterprise_proxy.rs

# 修复 react_card_proxy.rs 剩余的类型注解
sed -i 's/let response: ApiResponse<serde_json::Value> =/let response =/g' src/proxy/react_card_proxy.rs
sed -i 's/let response: ApiResponse<Vec<HashMap<String, serde_json::Value>>> =/let response =/g' src/proxy/react_card_proxy.rs

# 修复 ai_proxy.rs 剩余的类型注解
sed -i 's/let response: ApiResponse<HashMap<String, f64>> =/let response =/g' src/proxy/ai_proxy.rs

echo "类型注解修复完成"