/**
 * 企业级侧边栏组件 - 最高性能客户列表
 * 
 * 集成所有企业级优化：
 * - 虚拟滚动和懒加载
 * - 智能内存管理
 * - WebSocket实时更新
 * - 性能监控和分析
 * - 渐进式加载
 * - DOM优化
 * - 用户体验优化
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef,
  memo,
  Suspense
} from 'react';
import {
  Avatar,
  Badge,
  Button,
  Chip,
  Divider,
  Input,
  Skeleton,
  ScrollShadow,
  Spinner,
  useDisclosure
} from '@heroui/react';
import { Icon } from '@iconify/react';

// 企业级工具导入
import { useEnterpriseWebSocket } from '../hooks/useEnterpriseWebSocket.js';
import EnterpriseCustomerList from './EnterpriseCustomerList.jsx';
import memoryManager from '../utils/MemoryManager.js';
import performanceProfiler from '../utils/PerformanceProfiler.js';
import progressiveLoader from '../utils/ProgressiveLoader.js';
import domOptimizer from '../utils/DOMOptimizer.js';

// 企业级侧边栏配置
const SIDEBAR_CONFIG = {
  VIRTUAL_THRESHOLD: 100,
  SEARCH_DEBOUNCE: 300,
  UPDATE_BATCH_SIZE: 50,
  PRELOAD_COUNT: 20,
  PERFORMANCE_SAMPLE_RATE: 0.1,
  MEMORY_CLEANUP_INTERVAL: 60000
};

// 性能监控包装器
const PerformanceWrapper = memo(({ children, componentName }) => {
  const renderStart = useRef(Date.now());
  
  useEffect(() => {
    const renderTime = Date.now() - renderStart.current;
    performanceProfiler.recordCustomMetric(`${componentName}_render`, renderTime);
  });

  return children;
});

// 企业级用户项组件
const EnterpriseUserItem = memo(({ 
  user, 
  isSelected, 
  onSelect, 
  onAction,
  index,
  style 
}) => {
  const itemRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 可见性检测
  useEffect(() => {
    if (!itemRef.current) return;

    const handleVisibilityChange = (visible) => {
      setIsVisible(visible);
      if (visible && !isLoaded) {
        // 延迟加载用户详细信息
        progressiveLoader.load(
          `user_details_${user.user_id}`,
          () => loadUserDetails(user.user_id),
          { priority: 2 }
        ).then(() => {
          setIsLoaded(true);
        });
      }
    };

    domOptimizer.observeVisibility(itemRef.current, handleVisibilityChange);
    
    return () => {
      domOptimizer.unobserveVisibility(itemRef.current);
    };
  }, [user.user_id, isLoaded]);

  const loadUserDetails = useCallback(async (userId) => {
    // 模拟加载用户详细信息
    await new Promise(resolve => setTimeout(resolve, 100));
    return { userId, details: `详细信息_${userId}` };
  }, []);

  const handleClick = useCallback(() => {
    onSelect(user);
    progressiveLoader.behaviorPredictor?.recordInteraction('click', user.user_id);
  }, [user, onSelect]);

  const handleAction = useCallback((action) => {
    onAction(action, user);
    progressiveLoader.behaviorPredictor?.recordInteraction('action', `${user.user_id}_${action}`);
  }, [user, onAction]);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'online': return 'success';
      case 'busy': return 'warning';
      case 'away': return 'default';
      default: return 'default';
    }
  }, []);

  const getStatusText = useCallback((status) => {
    switch (status) {
      case 'online': return '在线';
      case 'busy': return '忙碌';
      case 'away': return '离开';
      default: return '离线';
    }
  }, []);

  return (
    <div 
      ref={itemRef}
      style={style}
      className={`
        group p-3 mx-2 rounded-lg border-2 transition-all duration-200 cursor-pointer
        ${isSelected 
          ? 'border-primary bg-primary-50 shadow-md' 
          : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
        }
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <Badge
          content=""
          color={getStatusColor(user.status)}
          placement="bottom-right"
          shape="circle"
          size="sm"
        >
          <Avatar
            src={user.avatar}
            name={user.user_name}
            size="sm"
            className="flex-shrink-0"
            isBordered={isSelected}
          />
        </Badge>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-foreground truncate">
              {user.user_name}
            </h4>
            {user.unreadCount > 0 && (
              <Badge 
                content={user.unreadCount} 
                color="danger" 
                size="sm"
                className="ml-2"
              />
            )}
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-default-400 truncate">
              {user.lastMessage || '暂无消息'}
            </p>
            <span className="text-xs text-default-400 ml-2">
              {user.lastMessageTime || ''}
            </span>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <Chip
              size="sm"
              variant="flat"
              color={getStatusColor(user.status)}
              className="text-xs"
            >
              {getStatusText(user.status)}
            </Chip>
            
            <Button
              isIconOnly
              variant="light"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleAction('menu');
              }}
            >
              <Icon icon="solar:menu-dots-bold" width={14} />
            </Button>
          </div>
        </div>
      </div>
      
      {/* 加载指示器 */}
      {isVisible && !isLoaded && (
        <div className="absolute top-2 right-2">
          <Spinner size="sm" color="primary" />
        </div>
      )}
    </div>
  );
});

// 企业级搜索组件
const EnterpriseSearch = memo(({ 
  value, 
  onChange, 
  onFilter,
  totalCount,
  filteredCount,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState(value);
  const [filter, setFilter] = useState('all');
  const debounceRef = useRef(null);

  // 防抖搜索
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChange(searchTerm);
    }, SIDEBAR_CONFIG.SEARCH_DEBOUNCE);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, onChange]);

  const handleFilterChange = useCallback((newFilter) => {
    setFilter(newFilter);
    onFilter(newFilter);
  }, [onFilter]);

  return (
    <div className="p-4 border-b space-y-3">
      {/* 搜索框 */}
      <Input
        placeholder="搜索客户..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        startContent={
          isLoading ? (
            <Spinner size="sm" />
          ) : (
            <Icon icon="solar:magnifer-linear" width={16} />
          )
        }
        clearable
        size="sm"
        className="w-full"
      />
      
      {/* 过滤器 */}
      <div className="flex gap-2 flex-wrap">
        <Chip
          variant={filter === 'all' ? 'solid' : 'bordered'}
          color="primary"
          size="sm"
          onClick={() => handleFilterChange('all')}
          className="cursor-pointer"
        >
          全部 ({totalCount})
        </Chip>
        <Chip
          variant={filter === 'online' ? 'solid' : 'bordered'}
          color="success"
          size="sm"
          onClick={() => handleFilterChange('online')}
          className="cursor-pointer"
        >
          在线
        </Chip>
        <Chip
          variant={filter === 'busy' ? 'solid' : 'bordered'}
          color="warning"
          size="sm"
          onClick={() => handleFilterChange('busy')}
          className="cursor-pointer"
        >
          忙碌
        </Chip>
        <Chip
          variant={filter === 'unread' ? 'solid' : 'bordered'}
          color="danger"
          size="sm"
          onClick={() => handleFilterChange('unread')}
          className="cursor-pointer"
        >
          未读
        </Chip>
      </div>
      
      {/* 统计信息 */}
      <div className="flex items-center justify-between text-xs text-default-400">
        <span>显示 {filteredCount} / {totalCount} 位客户</span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>实时更新</span>
        </div>
      </div>
    </div>
  );
});

// 企业级统计面板
const EnterpriseStatsPanel = memo(({ 
  stats, 
  performance, 
  isVisible,
  onToggle 
}) => {
  if (!isVisible) return null;

  return (
    <div className="p-4 border-t bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-foreground">性能统计</h4>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onClick={onToggle}
        >
          <Icon icon="solar:close-linear" width={14} />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-default-400">内存使用:</span>
          <span className="ml-2 font-mono text-primary">
            {performance.memoryUsage}MB
          </span>
        </div>
        <div>
          <span className="text-default-400">渲染次数:</span>
          <span className="ml-2 font-mono text-primary">
            {performance.renderCount}
          </span>
        </div>
        <div>
          <span className="text-default-400">更新次数:</span>
          <span className="ml-2 font-mono text-primary">
            {performance.updateCount}
          </span>
        </div>
        <div>
          <span className="text-default-400">缓存命中:</span>
          <span className="ml-2 font-mono text-primary">
            {stats.cacheHitRate?.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-default-400">连接数:</span>
          <span className="ml-2 font-mono text-primary">
            {stats.totalConnections}
          </span>
        </div>
        <div>
          <span className="text-default-400">延迟:</span>
          <span className="ml-2 font-mono text-primary">
            {stats.averageLatency?.toFixed(1)}ms
          </span>
        </div>
      </div>
    </div>
  );
});

// 主企业级侧边栏组件
const EnterpriseSidebar = memo(({ 
  wsUrl = 'ws://localhost:6006/ws',
  userId = 'enterprise_kefu',
  userType = 'kefu',
  onSelectCustomer,
  onCustomerAction,
  className = '',
  enablePerformanceMonitor = true,
  enableVirtualization = true,
  enableIntelligentPreload = true
}) => {
  // 状态管理
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [performanceStats, setPerformanceStats] = useState({});
  const [showStats, setShowStats] = useState(false);
  
  // 引用管理
  const sidebarRef = useRef(null);
  const cleanupRef = useRef([]);

  // 企业级WebSocket连接
  const {
    users,
    connectionStatus,
    metrics,
    connect,
    disconnect,
    isConnected
  } = useEnterpriseWebSocket(wsUrl, {
    userId,
    userType,
    enableBatchUpdates: true,
    enablePerformanceMonitor,
    onUserUpdate: (update) => {
      console.log('用户更新:', update);
    },
    onPerformanceUpdate: (perfMetrics) => {
      if (enablePerformanceMonitor) {
        setPerformanceStats(perfMetrics);
      }
    }
  });

  // 过滤用户列表
  const filteredUsers = useMemo(() => {
    let result = users;
    
    // 搜索过滤
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(user =>
        user.user_name?.toLowerCase().includes(searchLower) ||
        user.user_id?.toLowerCase().includes(searchLower) ||
        user.lastMessage?.toLowerCase().includes(searchLower)
      );
    }
    
    // 状态过滤
    if (filterType !== 'all') {
      result = result.filter(user => {
        switch (filterType) {
          case 'online':
            return user.status === 'online';
          case 'busy':
            return user.status === 'busy';
          case 'unread':
            return user.unreadCount > 0;
          default:
            return true;
        }
      });
    }
    
    // 排序：未读 > 在线 > 最后消息时间
    return result.sort((a, b) => {
      if (a.unreadCount !== b.unreadCount) {
        return b.unreadCount - a.unreadCount;
      }
      if (a.status !== b.status) {
        const statusOrder = { online: 3, busy: 2, away: 1, offline: 0 };
        return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
      }
      return new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0);
    });
  }, [users, searchTerm, filterType]);

  // 处理客户选择
  const handleSelectCustomer = useCallback((customer) => {
    setSelectedCustomer(customer);
    onSelectCustomer?.(customer);
    
    // 记录用户交互
    performanceProfiler.recordInteraction('customer_select', 50);
  }, [onSelectCustomer]);

  // 处理客户操作
  const handleCustomerAction = useCallback((action, customer) => {
    onCustomerAction?.(action, customer);
    
    // 记录用户交互
    performanceProfiler.recordInteraction('customer_action', 30);
  }, [onCustomerAction]);

  // 智能预加载
  useEffect(() => {
    if (!enableIntelligentPreload || filteredUsers.length === 0) return;

    const preloadItems = filteredUsers.slice(0, SIDEBAR_CONFIG.PRELOAD_COUNT).map(user => ({
      id: user.user_id,
      loadFn: () => loadUserDetails(user.user_id)
    }));

    progressiveLoader.preload(preloadItems, {
      priority: 3,
      batchSize: 5
    });
  }, [filteredUsers, enableIntelligentPreload]);

  // 模拟加载用户详情
  const loadUserDetails = useCallback(async (userId) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { userId, details: `详细信息_${userId}` };
  }, []);

  // 初始化
  useEffect(() => {
    // 启动性能监控
    if (enablePerformanceMonitor) {
      performanceProfiler.start();
      cleanupRef.current.push(() => performanceProfiler.stop());
    }

    // 初始化DOM优化
    domOptimizer.init();
    cleanupRef.current.push(() => domOptimizer.cleanup());

    // 初始化内存管理
    memoryManager.init();
    cleanupRef.current.push(() => memoryManager.destroy());

    // 连接WebSocket
    connect();

    return () => {
      cleanupRef.current.forEach(cleanup => cleanup());
      disconnect();
    };
  }, [connect, disconnect, enablePerformanceMonitor]);

  // 内存清理
  useEffect(() => {
    const interval = setInterval(() => {
      memoryManager.performCleanup();
    }, SIDEBAR_CONFIG.MEMORY_CLEANUP_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // 获取连接状态颜色
  const getConnectionStatusColor = useCallback(() => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'disconnected': return 'danger';
      default: return 'default';
    }
  }, [connectionStatus]);

  // 获取连接状态文本
  const getConnectionStatusText = useCallback(() => {
    switch (connectionStatus) {
      case 'connected': return '企业级连接';
      case 'connecting': return '连接中...';
      case 'disconnected': return '连接断开';
      default: return '未知状态';
    }
  }, [connectionStatus]);

  return (
    <PerformanceWrapper componentName="EnterpriseSidebar">
      <div 
        ref={sidebarRef}
        className={`flex flex-col h-full bg-white border-r ${className}`}
      >
        {/* 头部 */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <Icon icon="solar:chat-line-bold" className="text-white" width={16} />
              </div>
              <span className="text-sm font-bold text-foreground">企业客服</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Chip
                color={getConnectionStatusColor()}
                variant="flat"
                size="sm"
                startContent={
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                }
              >
                {getConnectionStatusText()}
              </Chip>
              
              {enablePerformanceMonitor && (
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onClick={() => setShowStats(!showStats)}
                >
                  <Icon icon="solar:chart-line-duotone" width={16} />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <EnterpriseSearch
          value={searchTerm}
          onChange={setSearchTerm}
          onFilter={setFilterType}
          totalCount={users.length}
          filteredCount={filteredUsers.length}
          isLoading={isLoading}
        />

        {/* 客户列表 */}
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <Spinner size="lg" />
            </div>
          }>
            <EnterpriseCustomerList
              customers={filteredUsers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={handleSelectCustomer}
              onCustomerAction={handleCustomerAction}
              websocketStatus={connectionStatus}
              enableVirtualization={enableVirtualization}
              enablePerformanceMonitor={enablePerformanceMonitor}
              onPerformanceUpdate={setPerformanceStats}
              className="h-full"
            />
          </Suspense>
        </div>

        {/* 性能统计面板 */}
        <EnterpriseStatsPanel
          stats={performanceStats}
          performance={metrics}
          isVisible={showStats}
          onToggle={() => setShowStats(!showStats)}
        />
      </div>
    </PerformanceWrapper>
  );
});

EnterpriseSidebar.displayName = 'EnterpriseSidebar';

export default EnterpriseSidebar;