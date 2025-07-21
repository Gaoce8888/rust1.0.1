use std::collections::HashMap;
use std::sync::Arc;
use chrono::Utc;
use tracing::{info, warn, error};
use uuid::Uuid;
use warp::Reply;

use crate::types::api::{
    ApiResponse, IpLocationQuery, IpLocationResponse, 
    ClientRegisterInfo, ClientRegisterResponse
};
use crate::storage::LocalStorage;

/// IP地理位置查询处理器
pub async fn handle_ip_location(
    query: IpLocationQuery,
) -> Result<impl Reply, warp::Rejection> {
    info!("🌍 IP地理位置查询: {}", query.ip);
    
    // 验证IP地址格式
    if !is_valid_ip(&query.ip) {
        warn!("❌ 无效的IP地址格式: {}", query.ip);
        let response = ApiResponse {
            success: false,
            message: "无效的IP地址格式".to_string(),
            data: None::<()>,
        };
        return Ok(warp::reply::json(&response));
    }
    
    // 获取IP地理位置信息
    let location = get_ip_location(&query.ip).await;
    
    let response = ApiResponse {
        success: true,
        message: "IP地理位置查询成功".to_string(),
        data: Some(location.clone()),
    };
    
    info!("✅ IP地理位置查询完成: {} -> {}, {}", 
          query.ip, location.country, location.city);
    
    Ok(warp::reply::json(&response))
}

/// 客户端信息注册处理器
pub async fn handle_client_register(
    register_info: ClientRegisterInfo,
    storage: Arc<LocalStorage>,
) -> Result<impl Reply, warp::Rejection> {
    info!("📱 客户端信息注册: type={}, ip={}", 
          register_info.client_type, register_info.ip_address);
    
    // 生成客户端ID
    let client_id = Uuid::new_v4().to_string();
    let registered_at = Utc::now();
    
    // 获取IP地理位置信息
    let location = if is_valid_ip(&register_info.ip_address) {
        Some(get_ip_location(&register_info.ip_address).await)
    } else {
        warn!("⚠️ 客户端提供的IP地址无效: {}", register_info.ip_address);
        None
    };
    
    // 构建客户端数据
    let client_data = serde_json::json!({
        "client_id": client_id,
        "client_type": register_info.client_type,
        "user_agent": register_info.user_agent,
        "version": register_info.version,
        "os": register_info.os,
        "browser": register_info.browser,
        "screen_resolution": register_info.screen_resolution,
        "ip_address": register_info.ip_address,
        "session_id": register_info.session_id,
        "extra_info": register_info.extra_info,
        "location": location,
        "registered_at": registered_at,
        "last_activity": registered_at
    });
    
    // 存储客户端信息
    let storage_key = format!("client:{client_id}");
    match storage.set(&storage_key, &client_data.to_string()).await {
        Ok(()) => {
            info!("✅ 客户端信息已存储: {}", client_id);
        }
        Err(e) => {
            error!("❌ 存储客户端信息失败: {:?}", e);
        }
    }
    
    // 构建响应
    let response_data = ClientRegisterResponse {
        client_id: client_id.clone(),
        registered_at: registered_at.to_rfc3339(),
        location,
    };
    
    let response = ApiResponse {
        success: true,
        message: "客户端注册成功".to_string(),
        data: Some(response_data),
    };
    
    info!("🎉 客户端注册完成: {}", client_id);
    
    Ok(warp::reply::json(&response))
}

/// 验证IP地址格式
fn is_valid_ip(ip: &str) -> bool {
    // 简单的IP地址验证
    ip.parse::<std::net::IpAddr>().is_ok()
}

/// 获取IP地理位置信息 (企业级实现)
async fn get_ip_location(ip: &str) -> IpLocationResponse {
    // 企业级IP地理位置查询实现
    // 这里可以集成第三方服务如 MaxMind, ipapi.co, ip-api.com 等
    
    // 对于内网IP或本地IP，返回默认位置
    if is_private_ip(ip) {
        return IpLocationResponse {
            ip: ip.to_string(),
            country: "本地网络".to_string(),
            region: "内网".to_string(),
            city: "本地".to_string(),
            latitude: None,
            longitude: None,
            isp: Some("内网".to_string()),
            timezone: Some("Asia/Shanghai".to_string()),
        };
    }
    
    // 简化的地理位置数据库 (企业级应使用真实的GeoIP数据库)
    let location_db = get_location_database();
    
    // 根据IP前缀匹配位置
    let ip_prefix = get_ip_prefix(ip);
    let location_info = location_db.get(&ip_prefix)
        .cloned()
        .unwrap_or_else(|| {
            // 默认位置信息
            LocationInfo {
                country: "中国".to_string(),
                region: "未知".to_string(),
                city: "未知".to_string(),
                latitude: Some(39.9042),
                longitude: Some(116.4074),
                isp: Some("未知运营商".to_string()),
                timezone: Some("Asia/Shanghai".to_string()),
            }
        });
    
    info!("🗺️ IP位置查询: {} -> {}, {}", ip, location_info.country, location_info.city);
    
    IpLocationResponse {
        ip: ip.to_string(),
        country: location_info.country,
        region: location_info.region,
        city: location_info.city,
        latitude: location_info.latitude,
        longitude: location_info.longitude,
        isp: location_info.isp,
        timezone: location_info.timezone,
    }
}

/// 检查是否为私有IP
fn is_private_ip(ip: &str) -> bool {
    if let Ok(addr) = ip.parse::<std::net::IpAddr>() {
        match addr {
            std::net::IpAddr::V4(ipv4) => {
                ipv4.is_private() || ipv4.is_loopback() || ipv4.is_link_local()
            }
            std::net::IpAddr::V6(ipv6) => {
                ipv6.is_loopback() || ipv6.is_unspecified()
            }
        }
    } else {
        true // 无效IP当作私有IP处理
    }
}

/// 获取IP前缀用于匹配
fn get_ip_prefix(ip: &str) -> String {
    // 取IP地址的前两段作为前缀
    let parts: Vec<&str> = ip.split('.').collect();
    if parts.len() >= 2 {
        format!("{}.{}", parts[0], parts[1])
    } else {
        ip.to_string()
    }
}

#[derive(Debug, Clone)]
struct LocationInfo {
    country: String,
    region: String,
    city: String,
    latitude: Option<f64>,
    longitude: Option<f64>,
    isp: Option<String>,
    timezone: Option<String>,
}

/// 获取简化的地理位置数据库 (`企业级实现应使用真实的GeoIP数据库`)
fn get_location_database() -> HashMap<String, LocationInfo> {
    let mut db = HashMap::new();
    
    // 中国主要城市IP段 (简化数据，企业级应使用完整的GeoIP数据库)
    db.insert("110.0".to_string(), LocationInfo {
        country: "中国".to_string(),
        region: "北京".to_string(),
        city: "北京".to_string(),
        latitude: Some(39.9042),
        longitude: Some(116.4074),
        isp: Some("中国电信".to_string()),
        timezone: Some("Asia/Shanghai".to_string()),
    });
    
    db.insert("121.0".to_string(), LocationInfo {
        country: "中国".to_string(),
        region: "上海".to_string(),
        city: "上海".to_string(),
        latitude: Some(31.2304),
        longitude: Some(121.4737),
        isp: Some("中国联通".to_string()),
        timezone: Some("Asia/Shanghai".to_string()),
    });
    
    db.insert("113.0".to_string(), LocationInfo {
        country: "中国".to_string(),
        region: "广东".to_string(),
        city: "广州".to_string(),
        latitude: Some(23.1291),
        longitude: Some(113.2644),
        isp: Some("中国移动".to_string()),
        timezone: Some("Asia/Shanghai".to_string()),
    });
    
    db.insert("114.0".to_string(), LocationInfo {
        country: "中国".to_string(),
        region: "广东".to_string(),
        city: "深圳".to_string(),
        latitude: Some(22.5431),
        longitude: Some(114.0579),
        isp: Some("中国电信".to_string()),
        timezone: Some("Asia/Shanghai".to_string()),
    });
    
    // 国际IP段示例
    db.insert("8.8".to_string(), LocationInfo {
        country: "美国".to_string(),
        region: "加利福尼亚".to_string(),
        city: "山景城".to_string(),
        latitude: Some(37.4056),
        longitude: Some(-122.0775),
        isp: Some("Google".to_string()),
        timezone: Some("America/Los_Angeles".to_string()),
    });
    
    db
} 