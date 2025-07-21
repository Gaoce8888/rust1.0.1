import React, { useState, useCallback, useMemo, useEffect, Suspense, lazy } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { VirtualList } from './VirtualList';
import { LazyImage } from './LazyImage';
import { useOptimizedState } from '@hooks/useOptimizedState';
import { useOptimizedApi } from '@services/optimizedApi';
import { performanceMonitor } from '@utils/performance';
import { Button, Card, CardBody, Spinner } from '@heroui/react';

// 懒加载组件
const CustomerList = lazy(() => import('./CustomerList'));
const ChatArea = lazy(() => import('./ChatArea'));

/**
 * 优化的主应用组件
 * 整合所有性能优化措施
 */
export const OptimizedApp = React.memo(() => {
  // 使用优化的状态管理
  const [customers, setCustomers] = useState([]);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({
    quickReplies: [
      '您好，有什么可以帮助您的吗？',
      '感谢您的咨询，我们会尽快为您处理。',
      '请问还有其他问题吗？',
    ],
    autoReply: true,
    notifications: true,
  });

  // 使用优化的API Hook
  const { data: apiData, loading: apiLoading, error: apiError, refetch } = useOptimizedApi(
    async () => {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        customers: [
          { id: '1', name: '张三', status: 'online', avatar: 'avatar1.jpg', timestamp: Date.now(), lastMessage: '你好', unreadCount: 2 },
          { id: '2', name: '李四', status: 'offline', avatar: 'avatar2.jpg', timestamp: Date.now(), lastMessage: '再见', unreadCount: 0 },
        ],
        messages: [],
      };
    },
    [],
    {
      cache: true,
      cacheTime: 5 * 60 * 1000,
      retry: true,
      retryCount: 3,
      debounce: 300,
    }
  );

  // 性能监控
  useEffect(() => {
    performanceMonitor.startTimer('OptimizedApp-mount');
    return () => {
      performanceMonitor.endTimer('OptimizedApp-mount');
    };
  }, []);

  // 优化的客户选择处理
  const handleCustomerSelect = useCallback((customer) => {
    setCurrentCustomer(customer);
    // 清除未读消息计数
    setCustomers(prev => 
      prev.map(c => 
        c.id === customer.id 
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
  }, []);

  // 优化的消息发送处理
  const handleSendMessage = useCallback((content) => {
    if (!currentCustomer) return;

    const newMessage = {
      id: Date.now().toString(),
      content,
      senderId: 'agent',
      senderName: '客服',
      senderAvatar: 'agent-avatar.jpg',
      timestamp: new Date().toISOString(),
      type: 'text',
      status: 'sent',
    };

    setMessages(prev => [...prev, newMessage]);

    // 更新客户最后消息
    setCustomers(prev => 
      prev.map(c => 
        c.id === currentCustomer.id 
          ? { ...c, lastMessage: content, timestamp: Date.now() }
          : c
      )
    );
  }, [currentCustomer]);

  // 优化的快速回复处理
  const handleQuickReply = useCallback((reply) => {
    handleSendMessage(reply);
  }, [handleSendMessage]);

  // 优化的设置更新处理
  const handleSettingChange = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // 使用useMemo缓存计算结果
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => customer.status === 'online');
  }, [customers]);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => b.timestamp - a.timestamp);
  }, [customers]);

  const unreadCount = useMemo(() => {
    return customers.reduce((total, customer) => total + customer.unreadCount, 0);
  }, [customers]);

  // 虚拟列表渲染函数
  const renderCustomerItem = useCallback(({ item, index, style }) => (
    <div
      style={style}
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        currentCustomer?.id === item.id
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-default-100'
      }`}
      onClick={() => handleCustomerSelect(item)}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <LazyImage
            src={item.avatar}
            alt={item.name}
            className="w-10 h-10 rounded-full"
            placeholder="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSIyMCIgeT0iMjUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OWE5YiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+5L2gPC90ZXh0Pjwvc3ZnPg=="
          />
          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
            item.status === 'online' ? 'bg-success' : 'bg-default-300'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-small font-medium truncate">{item.name}</p>
            <span className="text-tiny text-default-400">
              {new Date(item.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-tiny text-default-500 truncate">
            {item.lastMessage || '暂无消息'}
          </p>
        </div>
        {item.unreadCount > 0 && (
          <div className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {item.unreadCount}
          </div>
        )}
      </div>
    </div>
  ), [currentCustomer, handleCustomerSelect]);

  // 加载状态组件
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-32">
      <Spinner size="lg" />
    </div>
  );

  // 错误状态组件
  const ErrorState = ({ error, onRetry }) => (
    <Card className="max-w-md mx-auto">
      <CardBody className="text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold mb-2">加载失败</h2>
        <p className="text-default-500 mb-4">{error?.message || '未知错误'}</p>
        <Button color="primary" onClick={onRetry}>
          重试
        </Button>
      </CardBody>
    </Card>
  );

  // 空状态组件
  const EmptyState = () => (
    <div className="flex items-center justify-center h-32">
      <div className="text-center">
        <div className="text-6xl mb-4">💬</div>
        <p className="text-default-500">暂无客户</p>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-background">
        {/* 侧边栏 */}
        <div className="w-80 border-r border-divider bg-content1">
          <div className="p-4 border-b border-divider">
            <h1 className="text-lg font-bold">客服系统</h1>
            <p className="text-small text-default-500">
              在线客户: {filteredCustomers.length} | 未读消息: {unreadCount}
            </p>
          </div>

          {/* 客户列表 */}
          <div className="flex-1 overflow-hidden">
            {apiLoading ? (
              <LoadingSpinner />
            ) : apiError ? (
              <ErrorState error={apiError} onRetry={refetch} />
            ) : customers.length === 0 ? (
              <EmptyState />
            ) : (
              <VirtualList
                items={sortedCustomers}
                itemHeight={80}
                itemRenderer={renderCustomerItem}
                className="h-full"
                overscanCount={5}
              />
            )}
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 flex flex-col">
          <Suspense fallback={<LoadingSpinner />}>
            {currentCustomer ? (
              <ChatArea
                messages={messages}
                currentCustomer={currentCustomer}
                onSendMessage={handleSendMessage}
                settings={settings}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <p className="text-default-500">选择一个客户开始聊天</p>
                </div>
              </div>
            )}
          </Suspense>

          {/* 快速回复 */}
          {currentCustomer && (
            <div className="p-4 border-t border-divider bg-content1">
              <div className="flex gap-2 flex-wrap">
                {settings.quickReplies.map((reply, index) => (
                  <Button
                    key={`quick-reply-${reply.substring(0, 10)}-${index}`}
                    size="sm"
                    variant="bordered"
                    onClick={() => handleQuickReply(reply)}
                  >
                    {reply}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
});

OptimizedApp.displayName = 'OptimizedApp';

/**
 * 性能监控组件
 * 用于显示性能指标
 */
export const PerformanceMonitor = React.memo(() => {
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    const updateMetrics = () => {
      const allMetrics = performanceMonitor.getAllMetrics();
      setMetrics(allMetrics);
    };

    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-xs">
      <h3 className="font-bold mb-2">性能监控</h3>
      {Object.entries(metrics).map(([name, metric]) => (
        <div key={name} className="mb-1">
          <span className="text-gray-300">{name}:</span>
          <span className="ml-2">
            {metric.duration ? `${metric.duration.toFixed(2)}ms` : '进行中...'}
          </span>
        </div>
      ))}
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';