import React, { useState, useEffect } from 'react';
import { EnterpriseIpLocation, ipLocationManager, useIpLocation } from './EnterpriseIpLocation';
import { notificationManager, NotificationType, NotificationPriority } from './EnterpriseNotifications';

// 简单的IP位置查询示例
export const SimpleIpQuery = () => {
  const [ip, setIp] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleQuery = async () => {
    if (!ip.trim()) {
      alert('请输入IP地址');
      return;
    }

    try {
      setIsLoading(true);
      const location = await ipLocationManager.getIpLocation(ip.trim());
      setResult(location);
      
      notificationManager.add({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.NORMAL,
        title: '查询成功',
        message: `IP ${ip} 位置信息已获取`,
        autoDismiss: true,
        dismissDelay: 3000
      });
    } catch (error) {
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
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h3>🌍 简单IP位置查询</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="输入IP地址 (例如: 8.8.8.8)"
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
        />
        <button
          onClick={handleQuery}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '查询中...' : '查询'}
        </button>
      </div>

      {result && (
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h4>📍 查询结果</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div><strong>IP地址:</strong> {result.ip}</div>
            <div><strong>国家:</strong> {result.country}</div>
            <div><strong>省份:</strong> {result.region}</div>
            <div><strong>城市:</strong> {result.city}</div>
            <div><strong>运营商:</strong> {result.isp || '未知'}</div>
            <div><strong>时区:</strong> {result.timezone || '未知'}</div>
            {result.latitude && (
              <div><strong>纬度:</strong> {result.latitude.toFixed(6)}</div>
            )}
            {result.longitude && (
              <div><strong>经度:</strong> {result.longitude.toFixed(6)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 使用Hook的示例
export const HookExample = () => {
  const { isLoading, error, queryLocation } = useIpLocation();
  const [ip, setIp] = useState('');
  const [location, setLocation] = useState(null);

  const handleQuery = async () => {
    if (!ip.trim()) return;
    
    try {
      const result = await queryLocation(ip.trim());
      setLocation(result);
    } catch (error) {
      console.error('查询失败:', error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h3>🔧 Hook使用示例</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="输入IP地址"
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
        <button
          onClick={handleQuery}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '查询中...' : '查询'}
        </button>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '4px',
          padding: '10px',
          color: '#dc2626',
          marginBottom: '20px'
        }}>
          错误: {error}
        </div>
      )}

      {location && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h4>✅ 查询成功</h4>
          <p><strong>位置:</strong> {location.city}, {location.region}, {location.country}</p>
          <p><strong>运营商:</strong> {location.isp || '未知'}</p>
        </div>
      )}
    </div>
  );
};

// 客户端注册示例
export const ClientRegistrationExample = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [result, setResult] = useState(null);

  const handleRegister = async () => {
    try {
      setIsRegistering(true);
      const clientInfo = ipLocationManager.getCurrentClientInfo();
      const registrationResult = await ipLocationManager.registerClient(clientInfo);
      setResult(registrationResult);
      
      notificationManager.add({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.NORMAL,
        title: '注册成功',
        message: `客户端 ${registrationResult.client_id} 已注册`,
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
  };

  const clientInfo = ipLocationManager.getCurrentClientInfo();

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h3>📱 客户端注册示例</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <h4>当前客户端信息:</h4>
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <div><strong>客户端类型:</strong> {clientInfo.client_type}</div>
          <div><strong>操作系统:</strong> {clientInfo.os}</div>
          <div><strong>浏览器:</strong> {clientInfo.browser}</div>
          <div><strong>屏幕分辨率:</strong> {clientInfo.screen_resolution}</div>
          <div><strong>会话ID:</strong> {clientInfo.session_id}</div>
        </div>
        
        <button
          onClick={handleRegister}
          disabled={isRegistering}
          style={{
            padding: '12px 24px',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isRegistering ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {isRegistering ? '注册中...' : '📝 注册客户端'}
        </button>
      </div>

      {result && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h4>✅ 注册结果</h4>
          <div><strong>客户端ID:</strong> {result.client_id}</div>
          <div><strong>注册时间:</strong> {result.registered_at}</div>
          {result.location && (
            <div><strong>位置信息:</strong> {result.location.city}, {result.location.country}</div>
          )}
        </div>
      )}
    </div>
  );
};

// 主示例组件
export const IpLocationExample = () => {
  const [activeExample, setActiveExample] = useState('simple');

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2>🌍 IP位置功能示例</h2>
        <p>演示不同的IP位置查询和客户端注册功能</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', justifyContent: 'center' }}>
        <button
          onClick={() => setActiveExample('simple')}
          style={{
            padding: '10px 20px',
            background: activeExample === 'simple' ? '#3b82f6' : '#e5e7eb',
            color: activeExample === 'simple' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          简单查询
        </button>
        <button
          onClick={() => setActiveExample('hook')}
          style={{
            padding: '10px 20px',
            background: activeExample === 'hook' ? '#3b82f6' : '#e5e7eb',
            color: activeExample === 'hook' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Hook示例
        </button>
        <button
          onClick={() => setActiveExample('client')}
          style={{
            padding: '10px 20px',
            background: activeExample === 'client' ? '#3b82f6' : '#e5e7eb',
            color: activeExample === 'client' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          客户端注册
        </button>
        <button
          onClick={() => setActiveExample('full')}
          style={{
            padding: '10px 20px',
            background: activeExample === 'full' ? '#3b82f6' : '#e5e7eb',
            color: activeExample === 'full' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          完整功能
        </button>
      </div>

      {activeExample === 'simple' && <SimpleIpQuery />}
      {activeExample === 'hook' && <HookExample />}
      {activeExample === 'client' && <ClientRegistrationExample />}
      {activeExample === 'full' && <EnterpriseIpLocation />}
    </div>
  );
};

export default IpLocationExample;