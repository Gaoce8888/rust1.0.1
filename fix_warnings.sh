#!/bin/bash

echo "🔧 开始清除编译警告..."

# 1. 清除未使用的导入
echo "📝 清除未使用的导入..."

# 修复 src/config/mod.rs 中的未使用导入
sed -i '/use crate::config::address_manager::.*Config;/d' src/config/mod.rs

# 修复 src/handlers/sessions.rs 中的未使用导入
sed -i '/use crate::types::customer::CustomerInfo;/d' src/handlers/sessions.rs

# 修复 src/routes/api_extended.rs 中的未使用导入
sed -i '/use crate::handlers::system_extended::\*/d' src/routes/api_extended.rs

# 2. 添加 #[allow(dead_code)] 到未使用的结构体和函数
echo "📝 添加 dead_code 允许标记..."

# 为 ConfigManager 添加允许标记
sed -i 's/pub struct ConfigManager {/#[allow(dead_code)]\npub struct ConfigManager {/' src/config/mod.rs

# 为 AddressManager 添加允许标记
sed -i 's/pub struct AddressManager {/#[allow(dead_code)]\npub struct AddressManager {/' src/config/address_manager.rs

# 为 ConfigValidator 添加允许标记
sed -i 's/pub struct ConfigValidator {/#[allow(dead_code)]\npub struct ConfigValidator {/' src/config/address_manager.rs

# 为 ApiDoc 添加允许标记
sed -i 's/pub struct ApiDoc {/#[allow(dead_code)]\npub struct ApiDoc {/' src/handlers/api_docs.rs

# 3. 修复 never type fallback 警告
echo "📝 修复 never type fallback 警告..."

# 在 src/handlers/sessions.rs 中修复类型推断问题
sed -i 's/let sessions: Vec<SessionInfo> = sessions.into_iter().map(|session| {/let sessions: Vec<SessionInfo> = sessions.into_iter().map(|session| -> SessionInfo {/' src/handlers/sessions.rs

# 4. 为未使用的函数添加允许标记
echo "📝 为未使用的函数添加允许标记..."

# 在 src/config/mod.rs 中
sed -i 's/pub fn init_global_config/#[allow(dead_code)]\n    pub fn init_global_config/' src/config/mod.rs
sed -i 's/pub fn get_global_config/#[allow(dead_code)]\n    pub fn get_global_config/' src/config/mod.rs
sed -i 's/pub fn get_global_config_mut/#[allow(dead_code)]\n    pub fn get_global_config_mut/' src/config/mod.rs

# 在 src/config/address_manager.rs 中
sed -i 's/pub fn build_config_from_env/#[allow(dead_code)]\n    pub fn build_config_from_env/' src/config/address_manager.rs
sed -i 's/pub fn config_to_env_vars/#[allow(dead_code)]\n    pub fn config_to_env_vars/' src/config/address_manager.rs
sed -i 's/pub fn generate_config_docs/#[allow(dead_code)]\n    pub fn generate_config_docs/' src/config/address_manager.rs

# 在 src/handlers/system_extended.rs 中
sed -i 's/pub async fn handle_system_info/#[allow(dead_code)]\npub async fn handle_system_info/' src/handlers/system_extended.rs
sed -i 's/pub async fn handle_system_health/#[allow(dead_code)]\npub async fn handle_system_health/' src/handlers/system_extended.rs
sed -i 's/pub async fn handle_online_users/#[allow(dead_code)]\npub async fn handle_online_users/' src/handlers/system_extended.rs
sed -i 's/pub async fn handle_system_logs/#[allow(dead_code)]\npub async fn handle_system_logs/' src/handlers/system_extended.rs
sed -i 's/pub async fn handle_system_backup/#[allow(dead_code)]\npub async fn handle_system_backup/' src/handlers/system_extended.rs
sed -i 's/pub async fn handle_system_maintenance/#[allow(dead_code)]\npub async fn handle_system_maintenance/' src/handlers/system_extended.rs
sed -i 's/pub async fn handle_redis_status/#[allow(dead_code)]\npub async fn handle_redis_status/' src/handlers/system_extended.rs
sed -i 's/pub async fn handle_redis_flush/#[allow(dead_code)]\npub async fn handle_redis_flush/' src/handlers/system_extended.rs
sed -i 's/pub async fn handle_redis_keys/#[allow(dead_code)]\npub async fn handle_redis_keys/' src/handlers/system_extended.rs

# 在 src/handlers/analytics.rs 中
sed -i 's/pub async fn handle_generate_report/#[allow(dead_code)]\npub async fn handle_generate_report/' src/handlers/analytics.rs
sed -i 's/pub async fn handle_business_insights/#[allow(dead_code)]\npub async fn handle_business_insights/' src/handlers/analytics.rs

# 在 src/handlers/messages.rs 中
sed -i 's/pub async fn handle_bulk_delete_messages/#[allow(dead_code)]\npub async fn handle_bulk_delete_messages/' src/handlers/messages.rs
sed -i 's/pub async fn handle_mark_messages_read/#[allow(dead_code)]\npub async fn handle_mark_messages_read/' src/handlers/messages.rs

# 在 src/handlers/api_docs.rs 中
sed -i 's/pub async fn get_openapi_spec/#[allow(dead_code)]\npub async fn get_openapi_spec/' src/handlers/api_docs.rs

# 5. 为未使用的字段添加允许标记
echo "📝 为未使用的字段添加允许标记..."

# 在 src/config/mod.rs 中
sed -i 's/address_manager: Arc<AddressManager>,/#[allow(dead_code)]\n        address_manager: Arc<AddressManager>,'/ src/config/mod.rs

# 在 src/config/address_manager.rs 中
sed -i 's/config: Arc<RwLock<AddressConfig>>,/#[allow(dead_code)]\n        config: Arc<RwLock<AddressConfig>>,'/ src/config/address_manager.rs
sed -i 's/environment: String,/#[allow(dead_code)]\n        environment: String,'/ src/config/address_manager.rs
sed -i 's/cache: Arc<RwLock<HashMap<String, String>>>,/#[allow(dead_code)]\n        cache: Arc<RwLock<HashMap<String, String>>>,'/ src/config/address_manager.rs

# 6. 为未使用的方法添加允许标记
echo "📝 为未使用的方法添加允许标记..."

# 在 src/config/mod.rs 中
sed -i 's/pub fn address_manager(&self) -> Arc<AddressManager> {/#[allow(dead_code)]\n    pub fn address_manager(&self) -> Arc<AddressManager> {/' src/config/mod.rs
sed -i 's/pub fn address_manager_mut(&mut self) -> Arc<AddressManager> {/#[allow(dead_code)]\n    pub fn address_manager_mut(&mut self) -> Arc<AddressManager> {/' src/config/mod.rs
sed -i 's/pub async fn reload_all(&self) -> Result<()> {/#[allow(dead_code)]\n    pub async fn reload_all(&self) -> Result<()> {/' src/config/mod.rs
sed -i 's/pub async fn get_summary(&self) -> Result<String> {/#[allow(dead_code)]\n    pub async fn get_summary(&self) -> Result<String> {/' src/config/mod.rs

# 在 src/config/address_manager.rs 中
sed -i 's/pub async fn override_from_env(&mut self) -> Result<()> {/#[allow(dead_code)]\n    pub async fn override_from_env(&mut self) -> Result<()> {/' src/config/address_manager.rs

# 在 src/storage/file_manager.rs 中
sed -i 's/pub async fn list_files(&self) -> Result<Vec<FileInfo>> {/#[allow(dead_code)]\n    pub async fn list_files(&self) -> Result<Vec<FileInfo>> {/' src/storage/file_manager.rs
sed -i 's/pub async fn delete_file(&self, filename: &str) -> Result<()> {/#[allow(dead_code)]\n    pub async fn delete_file(&self, filename: &str) -> Result<()> {/' src/storage/file_manager.rs
sed -i 's/pub async fn get_file_info(&self, filename: &str) -> Result<Option<FileInfo>> {/#[allow(dead_code)]\n    pub async fn get_file_info(&self, filename: &str) -> Result<Option<FileInfo>> {/' src/storage/file_manager.rs

# 在 src/handlers/kefu.rs 中
sed -i 's/pub async fn find_available_kefu/#[allow(dead_code)]\npub async fn find_available_kefu/' src/handlers/kefu.rs
sed -i 's/pub async fn assign_kefu_for_customer/#[allow(dead_code)]\npub async fn assign_kefu_for_customer/' src/handlers/kefu.rs
sed -i 's/pub async fn increment_kefu_customers/#[allow(dead_code)]\npub async fn increment_kefu_customers/' src/handlers/kefu.rs
sed -i 's/pub async fn release_kefu_for_customer/#[allow(dead_code)]\npub async fn release_kefu_for_customer/' src/handlers/kefu.rs
sed -i 's/pub async fn get_kefu_for_customer/#[allow(dead_code)]\npub async fn get_kefu_for_customer/' src/handlers/kefu.rs
sed -i 's/pub async fn cleanup_expired_kefu/#[allow(dead_code)]\npub async fn cleanup_expired_kefu/' src/handlers/kefu.rs

# 7. 为未使用的静态变量添加允许标记
echo "📝 为未使用的静态变量添加允许标记..."

# 在 src/config/mod.rs 中
sed -i 's/static GLOBAL_CONFIG: OnceLock<ConfigManager> = OnceLock::new();/#[allow(dead_code)]\nstatic GLOBAL_CONFIG: OnceLock<ConfigManager> = OnceLock::new();/' src/config/mod.rs

# 8. 为未使用的函数添加允许标记
echo "📝 为未使用的函数添加允许标记..."

# 在 src/storage/file_manager.rs 中
sed -i 's/pub fn create_enhanced_file_manager/#[allow(dead_code)]\npub fn create_enhanced_file_manager/' src/storage/file_manager.rs

echo "✅ 警告清理完成！"