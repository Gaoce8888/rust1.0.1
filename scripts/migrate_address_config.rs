//! 地址配置迁移脚本
//! 
//! 此脚本帮助将现有的硬编码地址迁移到新的统一配置系统

use std::collections::HashMap;
use std::fs;
use std::path::Path;
use regex::Regex;
use anyhow::Result;

/// 地址配置迁移器
pub struct AddressConfigMigrator {
    source_dir: String,
    config_file: String,
    replacements: HashMap<String, String>,
}

impl AddressConfigMigrator {
    /// 创建新的迁移器
    pub fn new(source_dir: &str, config_file: &str) -> Self {
        Self {
            source_dir: source_dir.to_string(),
            config_file: config_file.to_string(),
            replacements: HashMap::new(),
        }
    }

    /// 扫描并识别硬编码的地址
    pub fn scan_hardcoded_addresses(&mut self) -> Result<Vec<HardcodedAddress>> {
        let mut addresses = Vec::new();
        
        // 扫描Rust文件
        self.scan_rust_files(&mut addresses)?;
        
        // 扫描配置文件
        self.scan_config_files(&mut addresses)?;
        
        // 扫描前端文件
        self.scan_frontend_files(&mut addresses)?;
        
        Ok(addresses)
    }

    /// 扫描Rust文件中的硬编码地址
    fn scan_rust_files(&self, addresses: &mut Vec<HardcodedAddress>) -> Result<()> {
        let rust_patterns = vec![
            (r#"ws://[^"]+"#, "WebSocket URL"),
            (r#"wss://[^"]+"#, "Secure WebSocket URL"),
            (r#"http://localhost:[0-9]+"#, "Local HTTP URL"),
            (r#"https://[^"]+"#, "HTTPS URL"),
            (r#"localhost:[0-9]+"#, "Localhost with port"),
            (r#"127\.0\.0\.1:[0-9]+"#, "Local IP with port"),
        ];

        self.scan_files_with_patterns("src", "*.rs", &rust_patterns, addresses)?;
        Ok(())
    }

    /// 扫描配置文件中的硬编码地址
    fn scan_config_files(&self, addresses: &mut Vec<HardcodedAddress>) -> Result<()> {
        let config_patterns = vec![
            (r#""[^"]*localhost[^"]*""#, "Localhost in config"),
            (r#""[^"]*127\.0\.0\.1[^"]*""#, "Local IP in config"),
            (r#""[^"]*ws://[^"]*""#, "WebSocket in config"),
            (r#""[^"]*wss://[^"]*""#, "Secure WebSocket in config"),
        ];

        self.scan_files_with_patterns("config", "*.{json,toml,yml,yaml}", &config_patterns, addresses)?;
        Ok(())
    }

    /// 扫描前端文件中的硬编码地址
    fn scan_frontend_files(&self, addresses: &mut Vec<HardcodedAddress>) -> Result<()> {
        let frontend_patterns = vec![
            (r#"localhost:[0-9]+"#, "Localhost in frontend"),
            (r#"127\.0\.0\.1:[0-9]+"#, "Local IP in frontend"),
            (r#"ws://[^"]+"#, "WebSocket in frontend"),
            (r#"wss://[^"]+"#, "Secure WebSocket in frontend"),
        ];

        self.scan_files_with_patterns("static", "*.{js,ts,jsx,tsx}", &frontend_patterns, addresses)?;
        Ok(())
    }

    /// 使用模式扫描文件
    fn scan_files_with_patterns(
        &self,
        dir: &str,
        pattern: &str,
        patterns: &[(String, &str)],
        addresses: &mut Vec<HardcodedAddress>,
    ) -> Result<()> {
        let dir_path = Path::new(&self.source_dir).join(dir);
        if !dir_path.exists() {
            return Ok(());
        }

        for entry in fs::read_dir(dir_path)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    let ext_str = ext.to_string_lossy();
                    if self.matches_pattern(&ext_str, pattern) {
                        self.scan_file(&path, patterns, addresses)?;
                    }
                }
            } else if path.is_dir() {
                // 递归扫描子目录
                self.scan_files_with_patterns(&path.to_string_lossy(), pattern, patterns, addresses)?;
            }
        }
        
        Ok(())
    }

    /// 检查文件扩展名是否匹配模式
    fn matches_pattern(&self, ext: &str, pattern: &str) -> bool {
        if pattern.contains("*") {
            let regex_pattern = pattern.replace("*", ".*");
            let regex = Regex::new(&regex_pattern).unwrap_or_else(|_| Regex::new("").unwrap());
            regex.is_match(ext)
        } else {
            ext == pattern
        }
    }

    /// 扫描单个文件
    fn scan_file(
        &self,
        file_path: &Path,
        patterns: &[(String, &str)],
        addresses: &mut Vec<HardcodedAddress>,
    ) -> Result<()> {
        let content = fs::read_to_string(file_path)?;
        let file_path_str = file_path.to_string_lossy();

        for (pattern, description) in patterns {
            let regex = Regex::new(pattern)?;
            
            for (line_num, line) in content.lines().enumerate() {
                for cap in regex.find_iter(line) {
                    addresses.push(HardcodedAddress {
                        file: file_path_str.to_string(),
                        line: line_num + 1,
                        content: cap.as_str().to_string(),
                        description: description.to_string(),
                        pattern: pattern.clone(),
                    });
                }
            }
        }
        
        Ok(())
    }

    /// 生成迁移建议
    pub fn generate_migration_suggestions(&self, addresses: &[HardcodedAddress]) -> String {
        let mut suggestions = String::new();
        suggestions.push_str("# 地址配置迁移建议\n\n");
        
        // 按文件分组
        let mut file_groups: HashMap<String, Vec<&HardcodedAddress>> = HashMap::new();
        for addr in addresses {
            file_groups.entry(addr.file.clone()).or_default().push(addr);
        }
        
        for (file, addrs) in file_groups {
            suggestions.push_str(&format!("## 文件: {}\n\n", file));
            
            for addr in addrs {
                suggestions.push_str(&format!("### 第{}行: {}\n", addr.line, addr.description));
                suggestions.push_str(&format!("**原始代码:**\n```\n{}\n```\n", addr.content));
                
                // 生成建议的替换
                let suggestion = self.generate_replacement_suggestion(addr);
                suggestions.push_str(&format!("**建议替换:**\n```\n{}\n```\n", suggestion));
                suggestions.push_str("\n");
            }
        }
        
        suggestions
    }

    /// 生成替换建议
    fn generate_replacement_suggestion(&self, addr: &HardcodedAddress) -> String {
        match addr.description.as_str() {
            "WebSocket URL" | "Secure WebSocket URL" => {
                "address_manager.get_ws_url().await".to_string()
            }
            "Local HTTP URL" | "HTTPS URL" => {
                "address_manager.get_api_url().await".to_string()
            }
            "Localhost with port" | "Local IP with port" => {
                "address_manager.get_server_port().await".to_string()
            }
            "Localhost in config" | "Local IP in config" => {
                "{{ address_manager.get_api_url() }}".to_string()
            }
            "WebSocket in config" | "Secure WebSocket in config" => {
                "{{ address_manager.get_ws_url() }}".to_string()
            }
            _ => {
                format!("// TODO: 替换为配置管理器的相应方法")
            }
        }
    }

    /// 执行迁移
    pub fn migrate(&mut self, addresses: &[HardcodedAddress]) -> Result<MigrationResult> {
        let mut result = MigrationResult {
            files_processed: 0,
            replacements_made: 0,
            errors: Vec::new(),
        };

        // 按文件分组处理
        let mut file_groups: HashMap<String, Vec<&HardcodedAddress>> = HashMap::new();
        for addr in addresses {
            file_groups.entry(addr.file.clone()).or_default().push(addr);
        }

        for (file_path, addrs) in file_groups {
            match self.migrate_file(&file_path, addrs) {
                Ok(replacements) => {
                    result.files_processed += 1;
                    result.replacements_made += replacements;
                }
                Err(e) => {
                    result.errors.push(format!("文件 {}: {}", file_path, e));
                }
            }
        }

        Ok(result)
    }

    /// 迁移单个文件
    fn migrate_file(&self, file_path: &str, addresses: Vec<&HardcodedAddress>) -> Result<usize> {
        let mut content = fs::read_to_string(file_path)?;
        let mut replacements = 0;

        // 按行号倒序排列，避免行号变化影响后续替换
        let mut sorted_addresses: Vec<_> = addresses.into_iter().collect();
        sorted_addresses.sort_by(|a, b| b.line.cmp(&a.line));

        for addr in sorted_addresses {
            let replacement = self.generate_replacement_suggestion(addr);
            
            // 简单的字符串替换（在实际使用中可能需要更复杂的解析）
            if content.contains(&addr.content) {
                content = content.replace(&addr.content, &replacement);
                replacements += 1;
            }
        }

        if replacements > 0 {
            fs::write(file_path, content)?;
        }

        Ok(replacements)
    }

    /// 生成配置模板
    pub fn generate_config_template(&self) -> String {
        r#"# 统一地址配置文件
# 此文件定义了系统中所有的地址、域名和网络相关配置

[domains]
# 主域名配置
primary_domain = "ylqkf.com"
api_subdomain = "a.ylqkf.com"
web_subdomain = "b.ylqkf.com"
admin_subdomain = "admin.ylqkf.com"

# 开发环境域名
dev_domain = "localhost"
dev_api_domain = "localhost"
dev_web_domain = "localhost"

# 测试环境域名
test_domain = "test.ylqkf.com"
test_api_domain = "api.test.ylqkf.com"
test_web_domain = "web.test.ylqkf.com"

# 生产环境域名
prod_domain = "ylqkf.com"
prod_api_domain = "a.ylqkf.com"
prod_web_domain = "b.ylqkf.com"

[ports]
# 服务器端口配置
server_port = 6006
api_port = 6006
websocket_port = 6006
admin_port = 6007
dev_port = 6007
test_port = 6008

[urls]
# 开发环境
dev_api_url = "http://localhost:6006/api"
dev_ws_url = "ws://localhost:6006/ws"
dev_web_url = "http://localhost:3000"
dev_admin_url = "http://localhost:6007"

# 测试环境
test_api_url = "https://api.test.ylqkf.com"
test_ws_url = "wss://api.test.ylqkf.com/ws"
test_web_url = "https://web.test.ylqkf.com"
test_admin_url = "https://admin.test.ylqkf.com"

# 生产环境
prod_api_url = "https://a.ylqkf.com"
prod_ws_url = "wss://a.ylqkf.com/ws"
prod_web_url = "https://b.ylqkf.com"
prod_admin_url = "https://admin.ylqkf.com"

[cors]
# CORS配置
enabled = true
allow_credentials = true

# 允许的源（开发环境）
dev_origins = [
    "http://localhost:6006",
    "http://localhost:6007", 
    "http://localhost:6008",
    "http://localhost:3000",
    "http://127.0.0.1:6006",
    "http://127.0.0.1:6007",
    "http://127.0.0.1:3000"
]

# 允许的源（生产环境）
prod_origins = [
    "https://b.ylqkf.com",
    "https://admin.ylqkf.com",
    "https://a.ylqkf.com"
]

[environment]
# 环境特定配置
current_environment = "development"  # development, test, production
"#.to_string()
    }
}

/// 硬编码地址信息
#[derive(Debug, Clone)]
pub struct HardcodedAddress {
    pub file: String,
    pub line: usize,
    pub content: String,
    pub description: String,
    pub pattern: String,
}

/// 迁移结果
#[derive(Debug)]
pub struct MigrationResult {
    pub files_processed: usize,
    pub replacements_made: usize,
    pub errors: Vec<String>,
}

/// 主函数
fn main() -> Result<()> {
    println!("🚀 地址配置迁移工具");
    println!("=" * 50);

    // 创建迁移器
    let mut migrator = AddressConfigMigrator::new(".", "config/address_config.toml");

    // 扫描硬编码地址
    println!("📋 扫描硬编码地址...");
    let addresses = migrator.scan_hardcoded_addresses()?;
    
    println!("发现 {} 个硬编码地址", addresses.len());

    if addresses.is_empty() {
        println!("✅ 没有发现硬编码地址，无需迁移");
        return Ok(());
    }

    // 生成迁移建议
    println!("📝 生成迁移建议...");
    let suggestions = migrator.generate_migration_suggestions(&addresses);
    
    // 保存建议到文件
    fs::write("MIGRATION_SUGGESTIONS.md", &suggestions)?;
    println!("💾 迁移建议已保存到 MIGRATION_SUGGESTIONS.md");

    // 生成配置模板
    println!("📄 生成配置模板...");
    let config_template = migrator.generate_config_template();
    
    // 保存配置模板
    fs::write("config/address_config.toml", &config_template)?;
    println!("💾 配置模板已保存到 config/address_config.toml");

    // 询问是否执行迁移
    println!("\n❓ 是否要执行自动迁移？(y/N)");
    let mut input = String::new();
    std::io::stdin().read_line(&mut input)?;
    
    if input.trim().to_lowercase() == "y" {
        println!("🔄 执行迁移...");
        let result = migrator.migrate(&addresses)?;
        
        println!("✅ 迁移完成:");
        println!("   处理文件数: {}", result.files_processed);
        println!("   替换次数: {}", result.replacements_made);
        
        if !result.errors.is_empty() {
            println!("⚠️  错误:");
            for error in &result.errors {
                println!("   {}", error);
            }
        }
    } else {
        println!("⏭️  跳过自动迁移，请手动执行迁移");
    }

    println!("\n📚 下一步:");
    println!("1. 查看 MIGRATION_SUGGESTIONS.md 了解详细迁移建议");
    println!("2. 检查 config/address_config.toml 并根据需要调整配置");
    println!("3. 在代码中使用 AddressManager 替换硬编码地址");
    println!("4. 运行测试确保功能正常");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_matches_pattern() {
        let migrator = AddressConfigMigrator::new(".", "");
        
        assert!(migrator.matches_pattern("rs", "*.rs"));
        assert!(migrator.matches_pattern("json", "*.json"));
        assert!(!migrator.matches_pattern("txt", "*.rs"));
    }

    #[test]
    fn test_generate_replacement_suggestion() {
        let migrator = AddressConfigMigrator::new(".", "");
        
        let addr = HardcodedAddress {
            file: "test.rs".to_string(),
            line: 1,
            content: "ws://localhost:6006/ws".to_string(),
            description: "WebSocket URL".to_string(),
            pattern: "ws://[^\"]+".to_string(),
        };
        
        let suggestion = migrator.generate_replacement_suggestion(&addr);
        assert_eq!(suggestion, "address_manager.get_ws_url().await");
    }
}