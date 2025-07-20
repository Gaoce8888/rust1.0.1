//! 跨平台兼容性模块
//! 
//! 提供Windows、Linux、macOS等平台的兼容性支持

use std::path::PathBuf;

/// 获取平台特定的数据目录
pub fn get_data_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        // Windows: 使用当前目录下的data文件夹
        PathBuf::from("data")
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux: 使用当前目录下的data文件夹
        PathBuf::from("data")
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: 使用当前目录下的data文件夹
        PathBuf::from("data")
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        // 其他平台: 使用当前目录下的data文件夹
        PathBuf::from("data")
    }
}

/// 获取平台特定的日志目录
pub fn get_logs_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        // Windows: 使用当前目录下的logs文件夹
        PathBuf::from("logs")
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux: 使用当前目录下的logs文件夹
        PathBuf::from("logs")
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: 使用当前目录下的logs文件夹
        PathBuf::from("logs")
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        // 其他平台: 使用当前目录下的logs文件夹
        PathBuf::from("logs")
    }
}

/// 获取平台特定的配置文件目录
pub fn get_config_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        // Windows: 使用当前目录下的config文件夹
        PathBuf::from("config")
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux: 使用当前目录下的config文件夹
        PathBuf::from("config")
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: 使用当前目录下的config文件夹
        PathBuf::from("config")
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        // 其他平台: 使用当前目录下的config文件夹
        PathBuf::from("config")
    }
}

/// 获取平台特定的临时目录
#[allow(dead_code)]
pub fn get_temp_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        // Windows: 使用系统临时目录
        std::env::temp_dir()
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux: 使用系统临时目录
        std::env::temp_dir()
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: 使用系统临时目录
        std::env::temp_dir()
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        // 其他平台: 使用系统临时目录
        std::env::temp_dir()
    }
}

/// 创建平台特定的目录结构
pub fn create_platform_directories() -> std::io::Result<()> {
    let data_dir = get_data_dir();
    let logs_dir = get_logs_dir();
    let config_dir = get_config_dir();
    
    // 创建数据目录
    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir)?;
    }
    
    // 创建日志目录
    if !logs_dir.exists() {
        std::fs::create_dir_all(&logs_dir)?;
    }
    
    // 创建配置目录
    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir)?;
    }
    
    // 创建子目录
    let subdirs = [
        data_dir.join("blobs"),
        data_dir.join("voice"),
        data_dir.join("cache"),
        data_dir.join("backups"),
    ];
    
    for subdir in subdirs {
        if !subdir.exists() {
            std::fs::create_dir_all(&subdir)?;
        }
    }
    
    Ok(())
}

/// 获取平台特定的路径分隔符
#[allow(dead_code)]
pub fn get_path_separator() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "\\"
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        "/"
    }
}

/// 标准化路径（处理不同平台的路径分隔符）
#[allow(dead_code)]
pub fn normalize_path(path: &str) -> String {
    #[cfg(target_os = "windows")]
    {
        path.replace("/", "\\")
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        path.replace("\\", "/")
    }
}

/// 检查是否为Windows平台
#[allow(dead_code)]
pub fn is_windows() -> bool {
    #[cfg(target_os = "windows")]
    {
        true
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

/// 检查是否为Linux平台
#[allow(dead_code)]
pub fn is_linux() -> bool {
    #[cfg(target_os = "linux")]
    {
        true
    }
    
    #[cfg(not(target_os = "linux"))]
    {
        false
    }
}

/// 检查是否为macOS平台
#[allow(dead_code)]
pub fn is_macos() -> bool {
    #[cfg(target_os = "macos")]
    {
        true
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_platform_directories() {
        assert!(get_data_dir().to_string_lossy().contains("data"));
        assert!(get_logs_dir().to_string_lossy().contains("logs"));
        assert!(get_config_dir().to_string_lossy().contains("config"));
    }

    #[test]
    fn test_path_separator() {
        let separator = get_path_separator();
        assert!(!separator.is_empty());
    }

    #[test]
    fn test_normalize_path() {
        let normalized = normalize_path("path/to/file");
        assert!(!normalized.is_empty());
    }
}