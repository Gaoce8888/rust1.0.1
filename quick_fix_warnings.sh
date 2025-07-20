#!/bin/bash

echo "🔧 快速修复编译警告..."

# 修复未使用的导入
echo "📝 修复未使用的导入..."
sed -i 's/use tracing::{info, warn, error};/use tracing::{info, warn};/g' src/auth/kefu_auth.rs

# 修复未使用的变量 - 添加下划线前缀
echo "📝 修复未使用的变量..."

# system.rs
sed -i 's/ws_manager: Arc<WebSocketManager>/_ws_manager: Arc<WebSocketManager>/g' src/handlers/system.rs

# system_extended.rs
sed -i 's/storage: Arc<crate::storage::LocalStorage>/_storage: Arc<crate::storage::LocalStorage>/g' src/handlers/system_extended.rs
sed -i 's/ws_manager: Arc<WebSocketManager>/_ws_manager: Arc<WebSocketManager>/g' src/handlers/system_extended.rs

# users.rs
sed -i 's/user_manager: Arc<UserManager>/_user_manager: Arc<UserManager>/g' src/handlers/users.rs

# sessions.rs
sed -i 's/ws_manager: Arc<WebSocketManager>/_ws_manager: Arc<WebSocketManager>/g' src/handlers/sessions.rs
sed -i 's/storage: Arc<LocalStorage>/_storage: Arc<LocalStorage>/g' src/handlers/sessions.rs
sed -i 's/let include_system = query.include_system.unwrap_or(false);/let _include_system = query.include_system.unwrap_or(false);/g' src/handlers/sessions.rs

# analytics.rs
sed -i 's/storage: Arc<LocalStorage>/_storage: Arc<LocalStorage>/g' src/handlers/analytics.rs
sed -i 's/let group_by = query.group_by.unwrap_or_else(|| "day".to_string());/let _group_by = query.group_by.unwrap_or_else(|| "day".to_string());/g' src/handlers/analytics.rs
sed -i 's/query: AnalyticsDateRange/_query: AnalyticsDateRange/g' src/handlers/analytics.rs
sed -i 's/ws_manager: Arc<WebSocketManager>/_ws_manager: Arc<WebSocketManager>/g' src/handlers/analytics.rs
sed -i 's/user_manager: Arc<UserManager>/_user_manager: Arc<UserManager>/g' src/handlers/analytics.rs
sed -i 's/let connection_stats = ws_manager.get_connection_stats().await;/let _connection_stats = ws_manager.get_connection_stats().await;/g' src/handlers/analytics.rs
sed -i 's/request: GenerateReportRequest/_request: GenerateReportRequest/g' src/handlers/analytics.rs

# 修复Redis类型注解
echo "📝 修复Redis类型注解..."
sed -i 's/conn.set_ex(&key, status_json, 3600).await?;/conn.set_ex::<_, _, ()>(&key, status_json, 3600).await?;/g' src/auth/kefu_auth.rs
sed -i 's/conn.sadd(&online_list_key, &kefu_auth.kefu_id).await?;/conn.sadd::<_, _, ()>(&online_list_key, &kefu_auth.kefu_id).await?;/g' src/auth/kefu_auth.rs
sed -i 's/conn.del(&key).await?;/conn.del::<_, ()>(&key).await?;/g' src/auth/kefu_auth.rs
sed -i 's/conn.srem(&online_list_key, kefu_id).await?;/conn.srem::<_, _, ()>(&online_list_key, kefu_id).await?;/g' src/auth/kefu_auth.rs
sed -i 's/conn.set_ex(&key, updated_json, 3600).await?;/conn.set_ex::<_, _, ()>(&key, updated_json, 3600).await?;/g' src/auth/kefu_auth.rs
sed -i 's/conn.set_ex(&customer_key, &kefu.kefu_id, 3600).await?;/conn.set_ex::<_, _, ()>(&customer_key, &kefu.kefu_id, 3600).await?;/g' src/auth/kefu_auth.rs
sed -i 's/conn.del(&customer_key).await?;/conn.del::<_, ()>(&customer_key).await?;/g' src/auth/kefu_auth.rs

echo "✅ 警告修复完成！"