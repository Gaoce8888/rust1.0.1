import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { 
  VirtualizedList, 
  useOptimizedCache, 
  useDebounce, 
  useThrottle,
  PerformanceMonitor 
} from './EnterpriseCore';
import { EnterpriseAIExample } from './EnterpriseAIExample';

// 性能指标类型
export const MetricType = {
  MESSAGES_PER_SECOND: 'messages_per_second',
  RESPONSE_TIME: 'response_time',
  CONNECTION_COUNT: 'connection_count',
  ERROR_RATE: 'error_rate',
  MEMORY_USAGE: 'memory_usage',
  CPU_USAGE: 'cpu_usage'
};

// 实时性能监控组件
export const RealTimeMetrics = React.memo(({ 
  metrics = [], 
  updateInterval = 1000,
  maxDataPoints = 100,
  onMetricUpdate,
  className = ""
}) => {
  const [currentMetrics, setCurrentMetrics] = useState({});
  const [historicalData, setHistoricalData] = useState({});
  const { getCached, setCached } = useOptimizedCache(50);

  // 更新指标数据
  const updateMetrics = useCallback((newMetrics) => {
    const timestamp = Date.now();
    
    setCurrentMetrics(prev => {
      const updated = { ...prev };
      newMetrics.forEach(metric => {
        updated[metric.type] = {
          ...metric,
          timestamp
        };
      });
      return updated;
    });

    // 更新历史数据
    setHistoricalData(prev => {
      const updated = { ...prev };
      newMetrics.forEach(metric => {
        if (!updated[metric.type]) {
          updated[metric.type] = [];
        }
        
        const dataPoint = {
          value: metric.value,
          timestamp,
          label: metric.label
        };
        
        updated[metric.type].push(dataPoint);
        
        // 限制数据点数量
        if (updated[metric.type].length > maxDataPoints) {
          updated[metric.type] = updated[metric.type].slice(-maxDataPoints);
        }
      });
      return updated;
    });

    onMetricUpdate?.(newMetrics);
  }, [maxDataPoints, onMetricUpdate]);

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      const mockMetrics = [
        {
          type: MetricType.MESSAGES_PER_SECOND,
          value: Math.random() * 100,
          label: '消息/秒'
        },
        {
          type: MetricType.RESPONSE_TIME,
          value: Math.random() * 500,
          label: '响应时间(ms)'
        },
        {
          type: MetricType.CONNECTION_COUNT,
          value: Math.floor(Math.random() * 1000),
          label: '连接数'
        }
      ];
      
      updateMetrics(mockMetrics);
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval, updateMetrics]);

  const renderMetricCard = useCallback((metricType, data) => {
    const currentValue = currentMetrics[metricType]?.value || 0;
    const history = historicalData[metricType] || [];
    
    return (
      <div key={metricType} className="metric-card">
        <div className="metric-header">
          <h3>{data.label}</h3>
          <span className="metric-value">{currentValue.toFixed(2)}</span>
        </div>
        <div className="metric-chart">
          <MiniChart data={history} />
        </div>
      </div>
    );
  }, [currentMetrics, historicalData]);

  return (
    <PerformanceMonitor componentName="RealTimeMetrics">
      <div className={`real-time-metrics ${className}`}>
        <h2>实时性能监控</h2>
        <div className="metrics-grid">
          {Object.entries(MetricType).map(([key, value]) => 
            renderMetricCard(value, { label: key })
          )}
        </div>
      </div>
    </PerformanceMonitor>
  );
});

// 迷你图表组件
const MiniChart = React.memo(({ data = [], height = 60 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height: canvasHeight } = canvas;

    // 清空画布
    ctx.clearRect(0, 0, width, canvasHeight);

    // 计算数据范围
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    // 绘制折线图
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;

    data.forEach((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = canvasHeight - ((point.value - min) / range) * canvasHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [data, height]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={height}
      className="mini-chart"
    />
  );
});

// 连接状态监控组件
export const ConnectionMonitor = React.memo(({ 
  connections = [], 
  onConnectionUpdate,
  className = ""
}) => {
  const [connectionStats, setConnectionStats] = useState({
    total: 0,
    active: 0,
    idle: 0,
    error: 0
  });

  // 计算连接统计
  useEffect(() => {
    const stats = connections.reduce((acc, conn) => {
      acc.total++;
      acc[conn.status]++;
      return acc;
    }, { total: 0, active: 0, idle: 0, error: 0 });

    setConnectionStats(stats);
  }, [connections]);

  const renderConnectionItem = useCallback((connection) => {
    const statusClass = `connection-status ${connection.status}`;
    
    return (
      <div key={connection.id} className="connection-item">
        <div className="connection-info">
          <span className="connection-id">{connection.id}</span>
          <span className={statusClass}>{connection.status}</span>
        </div>
        <div className="connection-meta">
          <span>连接时间: {new Date(connection.connectTime).toLocaleTimeString()}</span>
          <span>消息数: {connection.messageCount}</span>
        </div>
      </div>
    );
  }, []);

  return (
    <div className={`connection-monitor ${className}`}>
      <div className="monitor-header">
        <h3>连接监控</h3>
        <div className="connection-stats">
          <span className="stat-item">
            总计: {connectionStats.total}
          </span>
          <span className="stat-item active">
            活跃: {connectionStats.active}
          </span>
          <span className="stat-item idle">
            空闲: {connectionStats.idle}
          </span>
          <span className="stat-item error">
            错误: {connectionStats.error}
          </span>
        </div>
      </div>
      
      <div className="connections-list">
        <VirtualizedList
          items={connections}
          itemHeight={60}
          containerHeight={400}
          renderItem={renderConnectionItem}
          overscan={5}
        />
      </div>
    </div>
  );
});

// 消息统计组件
export const MessageStatistics = React.memo(({ 
  messages = [], 
  timeRange = '24h',
  onTimeRangeChange,
  className = ""
}) => {
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    received: 0,
    failed: 0,
    averageResponseTime: 0
  });

  // 计算消息统计
  useEffect(() => {
    const now = Date.now();
    const rangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }[timeRange] || 24 * 60 * 60 * 1000;

    const filteredMessages = messages.filter(msg => 
      now - new Date(msg.timestamp).getTime() < rangeMs
    );

    const newStats = filteredMessages.reduce((acc, msg) => {
      acc.total++;
      
      if (msg.direction === 'sent') {
        acc.sent++;
      } else {
        acc.received++;
      }
      
      if (msg.status === 'failed') {
        acc.failed++;
      }
      
      if (msg.responseTime) {
        acc.totalResponseTime += msg.responseTime;
      }
      
      return acc;
    }, { 
      total: 0, 
      sent: 0, 
      received: 0, 
      failed: 0, 
      totalResponseTime: 0 
    });

    newStats.averageResponseTime = newStats.total > 0 
      ? newStats.totalResponseTime / newStats.total 
      : 0;

    setStats(newStats);
  }, [messages, timeRange]);

  return (
    <div className={`message-statistics ${className}`}>
      <div className="stats-header">
        <h3>消息统计</h3>
        <select 
          value={timeRange} 
          onChange={(e) => onTimeRangeChange?.(e.target.value)}
        >
          <option value="1h">最近1小时</option>
          <option value="24h">最近24小时</option>
          <option value="7d">最近7天</option>
        </select>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">总消息数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.sent}</div>
          <div className="stat-label">发送消息</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.received}</div>
          <div className="stat-label">接收消息</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.failed}</div>
          <div className="stat-label">失败消息</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.averageResponseTime.toFixed(2)}ms</div>
          <div className="stat-label">平均响应时间</div>
        </div>
      </div>
    </div>
  );
});

// 系统健康检查组件
export const SystemHealthCheck = React.memo(({ 
  healthData = {},
  onHealthUpdate,
  className = ""
}) => {
  const [healthStatus, setHealthStatus] = useState('healthy');
  const [lastCheck, setLastCheck] = useState(null);

  // 评估系统健康状态
  useEffect(() => {
    const checks = Object.values(healthData);
    const failedChecks = checks.filter(check => !check.healthy);
    
    let newStatus = 'healthy';
    if (failedChecks.length > 0) {
      newStatus = failedChecks.length > 2 ? 'critical' : 'warning';
    }
    
    setHealthStatus(newStatus);
    setLastCheck(new Date());
  }, [healthData]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '❌';
      default: return '❓';
    }
  };

  const renderHealthItem = useCallback(([service, data]) => {
    return (
      <div key={service} className={`health-item ${data.healthy ? 'healthy' : 'unhealthy'}`}>
        <div className="health-service">
          <span className="health-icon">{getStatusIcon(data.healthy ? 'healthy' : 'critical')}</span>
          <span className="service-name">{service}</span>
        </div>
        <div className="health-details">
          <span className="response-time">{data.responseTime}ms</span>
          {!data.healthy && (
            <span className="error-message">{data.error}</span>
          )}
        </div>
      </div>
    );
  }, []);

  return (
    <div className={`system-health-check ${className}`}>
      <div className="health-header">
        <h3>系统健康检查</h3>
        <div className={`health-status ${healthStatus}`}>
          {getStatusIcon(healthStatus)} {healthStatus}
        </div>
      </div>
      
      {lastCheck && (
        <div className="last-check">
          最后检查: {lastCheck.toLocaleTimeString()}
        </div>
      )}
      
      <div className="health-services">
        {Object.entries(healthData).map(renderHealthItem)}
      </div>
    </div>
  );
});

// 主仪表板组件
export const EnterpriseDashboard = React.memo(({ 
  metrics = [],
  connections = [],
  messages = [],
  healthData = {},
  onRefresh,
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef(null);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        onRefresh?.();
      }, 5000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, onRefresh]);

  const tabs = [
    { id: 'overview', label: '概览', component: RealTimeMetrics },
    { id: 'connections', label: '连接', component: ConnectionMonitor },
    { id: 'messages', label: '消息', component: MessageStatistics },
    { id: 'health', label: '健康', component: SystemHealthCheck },
    { id: 'ai', label: '🤖 AI功能', component: EnterpriseAIExample }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className={`enterprise-dashboard ${className}`}>
      <div className="dashboard-header">
        <h1>企业级监控仪表板</h1>
        <div className="dashboard-controls">
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            自动刷新
          </label>
          <button onClick={() => onRefresh?.()}>刷新</button>
        </div>
      </div>
      
      <div className="dashboard-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="dashboard-content">
        {ActiveComponent && (
          <ActiveComponent
            metrics={metrics}
            connections={connections}
            messages={messages}
            healthData={healthData}
          />
        )}
      </div>
    </div>
  );
});

// 导出所有组件
export default {
  RealTimeMetrics,
  ConnectionMonitor,
  MessageStatistics,
  SystemHealthCheck,
  EnterpriseDashboard,
  EnterpriseAIExample,
  MetricType
};