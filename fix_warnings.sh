#!/bin/bash

echo "🔧 开始修复Rust编译警告..."

# 修复未使用的变量警告 - 在变量名前添加下划线
echo "📝 修复未使用的变量警告..."

# 修复handlers/system_extended.rs中的未使用变量
sed -i 's/ws_manager: Arc<WebSocketManager>/_ws_manager: Arc<WebSocketManager>/g' src/handlers/system_extended.rs
sed -i 's/storage: Arc<crate::storage::LocalStorage>/_storage: Arc<crate::storage::LocalStorage>/g' src/handlers/system_extended.rs

# 修复handlers/users.rs中的未使用变量
sed -i 's/user_manager: Arc<UserManager>/_user_manager: Arc<UserManager>/g' src/handlers/users.rs

# 修复handlers/sessions.rs中的未使用变量
sed -i 's/ws_manager: Arc<WebSocketManager>/_ws_manager: Arc<WebSocketManager>/g' src/handlers/sessions.rs
sed -i 's/storage: Arc<LocalStorage>/_storage: Arc<LocalStorage>/g' src/handlers/sessions.rs
sed -i 's/let include_system = query.include_system.unwrap_or(false);/let _include_system = query.include_system.unwrap_or(false);/g' src/handlers/sessions.rs

# 修复handlers/analytics.rs中的未使用变量
sed -i 's/storage: Arc<LocalStorage>/_storage: Arc<LocalStorage>/g' src/handlers/analytics.rs
sed -i 's/let group_by = query.group_by.unwrap_or_else(|| "day".to_string());/let _group_by = query.group_by.unwrap_or_else(|| "day".to_string());/g' src/handlers/analytics.rs
sed -i 's/query: AnalyticsDateRange/_query: AnalyticsDateRange/g' src/handlers/analytics.rs
sed -i 's/ws_manager: Arc<WebSocketManager>/_ws_manager: Arc<WebSocketManager>/g' src/handlers/analytics.rs
sed -i 's/user_manager: Arc<UserManager>/_user_manager: Arc<UserManager>/g' src/handlers/analytics.rs
sed -i 's/let connection_stats = ws_manager.get_connection_stats().await;/let _connection_stats = ws_manager.get_connection_stats().await;/g' src/handlers/analytics.rs
sed -i 's/request: GenerateReportRequest/_request: GenerateReportRequest/g' src/handlers/analytics.rs

echo "✅ 警告修复完成！"
echo "💡 现在可以运行 'cargo build --release' 来验证修复效果"