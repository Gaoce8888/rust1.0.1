import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { notificationManager, NotificationType, NotificationPriority } from './EnterpriseNotifications';
import './EnterpriseIpLocation.css';

// IP位置查询类 - 与后端IpLocationQuery对应
export class IpLocationQuery {
  constructor(ip) {
    this.ip = ip;
  }
}

// IP位置响应类 - 与后端IpLocationResponse对应
export class IpLocationResponse {
  constructor(data = {}) {
    this.ip = data.ip || '';
    this.country = data.country || '';
    this.region = data.region || '';
    this.city = data.city || '';
    this.latitude = data.latitude || null;
    this.longitude = data.longitude || null;
    this.isp = data.isp || null;
    this.timezone = data.timezone || null;
  }
}

// 客户端注册信息类 - 与后端ClientRegisterInfo对应
export class ClientRegisterInfo {
  constructor(data = {}) {
    this.client_type = data.client_type || 'web';
    this.user_agent = data.user_agent || '';
    this.version = data.version || null;
    this.os = data.os || null;
    this.browser = data.browser || null;
    this.screen_resolution = data.screen_resolution || null;
    this.ip_address = data.ip_address || '';
    this.session_id = data.session_id || null;
    this.extra_info = data.extra_info || null;
  }
}

// IP位置管理器类
export class IpLocationManager {
  constructor() {
    this.apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:6006';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  // 获取IP位置信息
  async getIpLocation(ip) {
    try {
      // 检查缓存
      const cacheKey = `ip_location_${ip}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await fetch(`${this.apiBaseUrl}/api/client/location?ip=${encodeURIComponent(ip)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '查询失败');
      }

      const locationData = new IpLocationResponse(result.data);
      
      // 缓存结果
      this.cache.set(cacheKey, {
        data: locationData,
        timestamp: Date.now()
      });

      return locationData;
    } catch (error) {
      console.error('获取IP位置失败:', error);
      throw error;
    }
  }

  // 注册客户端信息
  async registerClient(clientInfo) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/client/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientInfo)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '注册失败');
      }

      return result.data;
    } catch (error) {
      console.error('客户端注册失败:', error);
      throw error;
    }
  }

  // 获取当前客户端信息
  getCurrentClientInfo() {
    const userAgent = navigator.userAgent;
    const screenResolution = `${screen.width}x${screen.height}`;
    
    // 检测操作系统
    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    // 检测浏览器
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // 检测客户端类型
    let clientType = 'web';
    if (userAgent.includes('Mobile')) clientType = 'mobile';
    else if (userAgent.includes('Electron')) clientType = 'desktop';

    return new ClientRegisterInfo({
      client_type: clientType,
      user_agent: userAgent,
      os: os,
      browser: browser,
      screen_resolution: screenResolution,
      ip_address: '', // 需要从服务器获取
      session_id: this.generateSessionId(),
      extra_info: {
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      }
    });
  }

  // 生成会话ID
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 验证IP地址格式
  validateIpAddress(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  // 清除缓存
  clearCache() {
    this.cache.clear();
  }

  // 获取缓存统计
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// 全局IP位置管理器实例
export const ipLocationManager = new IpLocationManager();

// IP位置查询组件
export const IpLocationQuery = React.memo(({ onLocationFound, className = "" }) => {
  const [ipAddress, setIpAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [error, setError] = useState('');

  const handleQuery = useCallback(async () => {
    if (!ipAddress.trim()) {
      setError('请输入IP地址');
      return;
    }

    if (!ipLocationManager.validateIpAddress(ipAddress.trim())) {
      setError('IP地址格式无效');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      const location = await ipLocationManager.getIpLocation(ipAddress.trim());
      setLocationData(location);
      onLocationFound?.(location);

      notificationManager.add({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.NORMAL,
        title: '查询成功',
        message: `IP ${ipAddress} 位置信息已获取`,
        autoDismiss: true,
        dismissDelay: 3000
      });
    } catch (error) {
      setError(error.message);
      notificationManager.add({
        type: NotificationType.ERROR,
        priority: NotificationPriority.HIGH,
        title: '查询失败',
        message: error.message,
        autoDismiss: false
      });
    } finally {
      setIsLoading(false);
    }
  }, [ipAddress, onLocationFound]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleQuery();
    }
  }, [handleQuery]);

  return (
    <div className={`ip-location-query ${className}`}>
      <div className="query-header">
        <h3>🌍 IP位置查询</h3>
        <p>输入IP地址获取地理位置信息</p>
      </div>

      <div className="query-form">
        <div className="input-group">
          <input
            type="text"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入IP地址 (例如: 8.8.8.8)"
            className="ip-input"
            disabled={isLoading}
          />
          <button
            onClick={handleQuery}
            disabled={isLoading || !ipAddress.trim()}
            className="query-btn"
          >
            {isLoading ? '查询中...' : '🔍 查询'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}
      </div>

      {locationData && (
        <IpLocationDisplay location={locationData} />
      )}
    </div>
  );
});

// IP位置显示组件
export const IpLocationDisplay = React.memo(({ location, className = "" }) => {
  const formatCoordinate = useCallback((coord) => {
    if (coord === null || coord === undefined) return '未知';
    return coord.toFixed(6);
  }, []);

  const getFlagEmoji = useCallback((country) => {
    // 简化的国家旗帜映射
    const flagMap = {
      '中国': '🇨🇳',
      '美国': '🇺🇸',
      '日本': '🇯🇵',
      '韩国': '🇰🇷',
      '英国': '🇬🇧',
      '德国': '🇩🇪',
      '法国': '🇫🇷',
      '加拿大': '🇨🇦',
      '澳大利亚': '🇦🇺',
      '俄罗斯': '🇷🇺',
      '印度': '🇮🇳',
      '巴西': '🇧🇷'
    };
    return flagMap[country] || '🌍';
  }, []);

  return (
    <div className={`ip-location-display ${className}`}>
      <div className="location-header">
        <h4>📍 位置信息</h4>
        <span className="ip-address">{location.ip}</span>
      </div>

      <div className="location-grid">
        <div className="location-item">
          <div className="item-label">国家/地区</div>
          <div className="item-value">
            {getFlagEmoji(location.country)} {location.country}
          </div>
        </div>

        <div className="location-item">
          <div className="item-label">省份/州</div>
          <div className="item-value">{location.region}</div>
        </div>

        <div className="location-item">
          <div className="item-label">城市</div>
          <div className="item-value">{location.city}</div>
        </div>

        <div className="location-item">
          <div className="item-label">运营商</div>
          <div className="item-value">{location.isp || '未知'}</div>
        </div>

        <div className="location-item">
          <div className="item-label">时区</div>
          <div className="item-value">{location.timezone || '未知'}</div>
        </div>

        <div className="location-item">
          <div className="item-label">纬度</div>
          <div className="item-value">{formatCoordinate(location.latitude)}</div>
        </div>

        <div className="location-item">
          <div className="item-label">经度</div>
          <div className="item-value">{formatCoordinate(location.longitude)}</div>
        </div>
      </div>

      {location.latitude && location.longitude && (
        <div className="map-container">
          <div className="map-placeholder">
            🗺️ 地图显示区域
            <br />
            <small>纬度: {location.latitude}, 经度: {location.longitude}</small>
          </div>
        </div>
      )}
    </div>
  );
});

// 客户端信息组件
export const ClientInfoDisplay = React.memo(({ clientInfo, className = "" }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);

  const handleRegister = useCallback(async () => {
    try {
      setIsRegistering(true);
      const result = await ipLocationManager.registerClient(clientInfo);
      setRegistrationResult(result);
      
      notificationManager.add({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.NORMAL,
        title: '注册成功',
        message: `客户端 ${result.client_id} 已注册`,
        autoDismiss: true,
        dismissDelay: 3000
      });
    } catch (error) {
      notificationManager.add({
        type: NotificationType.ERROR,
        priority: NotificationPriority.HIGH,
        title: '注册失败',
        message: error.message,
        autoDismiss: false
      });
    } finally {
      setIsRegistering(false);
    }
  }, [clientInfo]);

  return (
    <div className={`client-info-display ${className}`}>
      <div className="client-header">
        <h4>📱 客户端信息</h4>
        <button
          onClick={handleRegister}
          disabled={isRegistering}
          className="register-btn"
        >
          {isRegistering ? '注册中...' : '📝 注册客户端'}
        </button>
      </div>

      <div className="client-grid">
        <div className="client-item">
          <div className="item-label">客户端类型</div>
          <div className="item-value">{clientInfo.client_type}</div>
        </div>

        <div className="client-item">
          <div className="item-label">操作系统</div>
          <div className="item-value">{clientInfo.os}</div>
        </div>

        <div className="client-item">
          <div className="item-label">浏览器</div>
          <div className="item-value">{clientInfo.browser}</div>
        </div>

        <div className="client-item">
          <div className="item-label">屏幕分辨率</div>
          <div className="item-value">{clientInfo.screen_resolution}</div>
        </div>

        <div className="client-item">
          <div className="item-label">会话ID</div>
          <div className="item-value">{clientInfo.session_id}</div>
        </div>
      </div>

      {registrationResult && (
        <div className="registration-result">
          <h5>✅ 注册结果</h5>
          <div className="result-item">
            <span>客户端ID:</span>
            <span>{registrationResult.client_id}</span>
          </div>
          <div className="result-item">
            <span>注册时间:</span>
            <span>{registrationResult.registered_at}</span>
          </div>
          {registrationResult.location && (
            <div className="result-item">
              <span>位置信息:</span>
              <span>{registrationResult.location.city}, {registrationResult.location.country}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// 主IP位置管理器组件
export const EnterpriseIpLocation = React.memo(({ className = "" }) => {
  const [activeTab, setActiveTab] = useState('query');
  const [currentClientInfo, setCurrentClientInfo] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);

  // 初始化客户端信息
  useEffect(() => {
    const clientInfo = ipLocationManager.getCurrentClientInfo();
    setCurrentClientInfo(clientInfo);
  }, []);

  // 处理位置查询结果
  const handleLocationFound = useCallback((location) => {
    setQueryHistory(prev => [
      { ...location, timestamp: new Date() },
      ...prev.slice(0, 9) // 保留最近10条记录
    ]);
  }, []);

  // 清除查询历史
  const clearHistory = useCallback(() => {
    setQueryHistory([]);
  }, []);

  // 清除缓存
  const clearCache = useCallback(() => {
    ipLocationManager.clearCache();
    notificationManager.add({
      type: NotificationType.SUCCESS,
      priority: NotificationPriority.NORMAL,
      title: '缓存已清除',
      message: 'IP位置查询缓存已清空',
      autoDismiss: true,
      dismissDelay: 2000
    });
  }, []);

  return (
    <div className={`enterprise-ip-location ${className}`}>
      <div className="location-header">
        <h2>🌍 IP位置管理器</h2>
        <div className="header-actions">
          <button onClick={clearHistory} className="clear-btn">
            🗑️ 清除历史
          </button>
          <button onClick={clearCache} className="cache-btn">
            🧹 清除缓存
          </button>
        </div>
      </div>

      <div className="location-tabs">
        <button
          className={`tab-button ${activeTab === 'query' ? 'active' : ''}`}
          onClick={() => setActiveTab('query')}
        >
          🔍 IP查询
        </button>
        <button
          className={`tab-button ${activeTab === 'client' ? 'active' : ''}`}
          onClick={() => setActiveTab('client')}
        >
          📱 客户端信息
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 查询历史
        </button>
      </div>

      <div className="location-content">
        {activeTab === 'query' && (
          <IpLocationQuery onLocationFound={handleLocationFound} />
        )}

        {activeTab === 'client' && currentClientInfo && (
          <ClientInfoDisplay clientInfo={currentClientInfo} />
        )}

        {activeTab === 'history' && (
          <div className="query-history">
            <h3>📋 查询历史 ({queryHistory.length})</h3>
            {queryHistory.length === 0 ? (
              <p className="empty-history">暂无查询历史</p>
            ) : (
              <div className="history-list">
                {queryHistory.map((record, index) => (
                  <div key={index} className="history-item">
                    <div className="history-header">
                      <span className="history-ip">{record.ip}</span>
                      <span className="history-time">
                        {record.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <div className="history-location">
                      {record.city}, {record.region}, {record.country}
                    </div>
                    {record.isp && (
                      <div className="history-isp">运营商: {record.isp}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// Hook for using IP location manager
export const useIpLocation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const queryLocation = useCallback(async (ip) => {
    try {
      setIsLoading(true);
      setError(null);
      const location = await ipLocationManager.getIpLocation(ip);
      return location;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerClient = useCallback(async (clientInfo) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await ipLocationManager.registerClient(clientInfo);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    queryLocation,
    registerClient,
    ipLocationManager
  };
};

export default EnterpriseIpLocation;