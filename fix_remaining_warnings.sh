#!/bin/bash

echo "🔧 开始清除剩余的编译警告..."

# 1. 清除未使用的导入
echo "📝 清除未使用的导入..."

# 修复 src/config/mod.rs 中的未使用导入
sed -i 's/use crate::config::address_manager::.*Config;//d' src/config/mod.rs
sed -i '/use crate::config::address_manager::.*Config;/d' src/config/mod.rs

# 修复 src/handlers/sessions.rs 中的未使用导入
sed -i 's/CustomerInfo, //' src/handlers/sessions.rs

# 修复 src/handlers/kefu_assignment.rs 中的未使用导入
sed -i 's/CustomerInfo, //' src/handlers/kefu_assignment.rs

# 2. 为未使用的结构体和函数添加允许标记
echo "📝 添加 dead_code 允许标记..."

# 为 ConfigValidator 添加允许标记
sed -i 's/pub struct ConfigValidator;/#[allow(dead_code)]\npub struct ConfigValidator;/' src/config/mod.rs

# 为 ApiDoc 添加允许标记
sed -i 's/pub struct ApiDoc;/#[allow(dead_code)]\npub struct ApiDoc;/' src/swagger.rs

# 3. 为未使用的函数添加允许标记
echo "📝 为未使用的函数添加允许标记..."

# 在 src/config/mod.rs 中
sed -i 's/pub fn init_global_config/#[allow(dead_code)]\n    pub fn init_global_config/' src/config/mod.rs
sed -i 's/pub fn build_config_from_env/#[allow(dead_code)]\n    pub fn build_config_from_env/' src/config/mod.rs
sed -i 's/pub fn config_to_env_vars/#[allow(dead_code)]\n    pub fn config_to_env_vars/' src/config/mod.rs
sed -i 's/pub fn generate_config_docs/#[allow(dead_code)]\n    pub fn generate_config_docs/' src/config/mod.rs

# 在 src/config/address_manager.rs 中为所有未使用的方法添加允许标记
sed -i 's/pub async fn get_api_url/#[allow(dead_code)]\n    pub async fn get_api_url/' src/config/address_manager.rs
sed -i 's/pub async fn get_ws_url/#[allow(dead_code)]\n    pub async fn get_ws_url/' src/config/address_manager.rs
sed -i 's/pub async fn get_web_url/#[allow(dead_code)]\n    pub async fn get_web_url/' src/config/address_manager.rs
sed -i 's/pub async fn get_admin_url/#[allow(dead_code)]\n    pub async fn get_admin_url/' src/config/address_manager.rs
sed -i 's/pub async fn get_cors_origins/#[allow(dead_code)]\n    pub async fn get_cors_origins/' src/config/address_manager.rs
sed -i 's/pub async fn get_server_port/#[allow(dead_code)]\n    pub async fn get_server_port/' src/config/address_manager.rs
sed -i 's/pub async fn get_websocket_config/#[allow(dead_code)]\n    pub async fn get_websocket_config/' src/config/address_manager.rs
sed -i 's/pub async fn get_external_api_config/#[allow(dead_code)]\n    pub async fn get_external_api_config/' src/config/address_manager.rs
sed -i 's/pub async fn get_security_config/#[allow(dead_code)]\n    pub async fn get_security_config/' src/config/address_manager.rs
sed -i 's/pub async fn get_monitoring_config/#[allow(dead_code)]\n    pub async fn get_monitoring_config/' src/config/address_manager.rs
sed -i 's/pub fn get_environment/#[allow(dead_code)]\n    pub fn get_environment/' src/config/address_manager.rs
sed -i 's/pub fn is_development/#[allow(dead_code)]\n    pub fn is_development/' src/config/address_manager.rs
sed -i 's/pub fn is_production/#[allow(dead_code)]\n    pub fn is_production/' src/config/address_manager.rs
sed -i 's/pub fn is_test/#[allow(dead_code)]\n    pub fn is_test/' src/config/address_manager.rs
sed -i 's/pub async fn get_full_config/#[allow(dead_code)]\n    pub async fn get_full_config/' src/config/address_manager.rs
sed -i 's/pub async fn update_config/#[allow(dead_code)]\n    pub async fn update_config/' src/config/address_manager.rs
sed -i 's/pub async fn reload_config/#[allow(dead_code)]\n    pub async fn reload_config/' src/config/address_manager.rs
sed -i 's/pub async fn get_config_summary/#[allow(dead_code)]\n    pub async fn get_config_summary/' src/config/address_manager.rs

# 在 src/config/mod.rs 中为 ConfigManager 的方法添加允许标记
sed -i 's/pub fn address_manager(&self) -> &AddressManager {/#[allow(dead_code)]\n    pub fn address_manager(&self) -> &AddressManager {/' src/config/mod.rs
sed -i 's/pub fn address_manager_mut(&mut self) -> &mut AddressManager {/#[allow(dead_code)]\n    pub fn address_manager_mut(&mut self) -> &mut AddressManager {/' src/config/mod.rs
sed -i 's/pub async fn reload_all(&mut self) -> anyhow::Result<()> {/#[allow(dead_code)]\n    pub async fn reload_all(&mut self) -> anyhow::Result<()> {/' src/config/mod.rs
sed -i 's/pub async fn get_summary(&self) -> std::collections::HashMap<String, String> {/#[allow(dead_code)]\n    pub async fn get_summary(&self) -> std::collections::HashMap<String, String> {/' src/config/mod.rs

# 在 src/config/mod.rs 中为 ConfigValidator 的方法添加允许标记
sed -i 's/pub fn validate_address_config/#[allow(dead_code)]\n    pub fn validate_address_config/' src/config/mod.rs
sed -i 's/pub fn validate_websocket_config/#[allow(dead_code)]\n    pub fn validate_websocket_config/' src/config/mod.rs
sed -i 's/pub fn validate_security_config/#[allow(dead_code)]\n    pub fn validate_security_config/' src/config/mod.rs
sed -i 's/pub fn validate_full_config/#[allow(dead_code)]\n    pub fn validate_full_config/' src/config/mod.rs

# 在 src/config/compatibility.rs 中
sed -i 's/pub fn override_from_env(&mut self) {/#[allow(dead_code)]\n    pub fn override_from_env(&mut self) {/' src/config/compatibility.rs

# 在 src/file_manager_ext.rs 中
sed -i 's/async fn list_files/#[allow(dead_code)]\n    async fn list_files/' src/file_manager_ext.rs
sed -i 's/async fn delete_file/#[allow(dead_code)]\n    async fn delete_file/' src/file_manager_ext.rs
sed -i 's/async fn get_file_info/#[allow(dead_code)]\n    async fn get_file_info/' src/file_manager_ext.rs
sed -i 's/pub fn create_enhanced_file_manager/#[allow(dead_code)]\npub fn create_enhanced_file_manager/' src/file_manager_ext.rs

# 在 src/websocket.rs 中
sed -i 's/pub async fn find_available_kefu/#[allow(dead_code)]\n    pub async fn find_available_kefu/' src/websocket.rs

# 在 src/auth/kefu_auth.rs 中
sed -i 's/pub async fn assign_kefu_for_customer/#[allow(dead_code)]\n    pub async fn assign_kefu_for_customer/' src/auth/kefu_auth.rs
sed -i 's/async fn increment_kefu_customers/#[allow(dead_code)]\n    async fn increment_kefu_customers/' src/auth/kefu_auth.rs
sed -i 's/pub async fn release_kefu_for_customer/#[allow(dead_code)]\n    pub async fn release_kefu_for_customer/' src/auth/kefu_auth.rs
sed -i 's/pub async fn get_kefu_for_customer/#[allow(dead_code)]\n    pub async fn get_kefu_for_customer/' src/auth/kefu_auth.rs
sed -i 's/pub async fn cleanup_expired_kefu/#[allow(dead_code)]\n    pub async fn cleanup_expired_kefu/' src/auth/kefu_auth.rs

# 在 src/handlers/system.rs 中
sed -i 's/pub async fn handle_system_info/#[allow(dead_code)]\npub async fn handle_system_info/' src/handlers/system.rs
sed -i 's/pub async fn handle_system_health/#[allow(dead_code)]\npub async fn handle_system_health/' src/handlers/system.rs
sed -i 's/pub async fn handle_online_users/#[allow(dead_code)]\npub async fn handle_online_users/' src/handlers/system.rs

# 在 src/swagger.rs 中
sed -i 's/pub fn get_openapi_spec/#[allow(dead_code)]\npub fn get_openapi_spec/' src/swagger.rs

echo "✅ 剩余警告清理完成！"