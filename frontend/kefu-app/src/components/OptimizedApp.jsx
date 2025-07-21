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

// 优化的主应用组件
export const OptimizedApp = React.memo(() => {
  // 使用优化的状态管理
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 使用优化的列表状态
  const {
    items: customers,
    addItem: addCustomer,
    removeItem: removeCustomer,
    updateItem: updateCustomer,
    setFilters,
    setSortBy,
    setSortDirection
  } = useOptimizedList([]);

  // 使用优化的表单状态
  const {
    values: settings,
    setFieldValue: setSetting,
    handleSubmit: saveSettings
  } = useOptimizedForm({
    soundNotifications: true,
    autoReply: false,
    showTypingIndicator: true,
    onlineStatus: true,
    welcomeMessage: '您好！欢迎咨询，我是专业客服，很高兴为您服务。'
  });

  // 使用优化的API Hook
  const { data: apiData, loading: apiLoading, error: apiError, refetch } = useOptimizedApi(
    async () => {
      // 模拟API调用
      const response = await fetch('/api/customers');
      return response.json();
    },
    [],
    {
      cache: true,
      cacheTime: 300000, // 5分钟缓存
      retryCount: 3
    }
  );

  // 性能监控
  useEffect(() => {
    performanceMonitor.startTimer('OptimizedApp-mount');
    return () => {
      performanceMonitor.endTimer('OptimizedApp-mount');
    };
  }, []);

  // 移动端检测
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 优化的回调函数
  const handleCustomerSelect = useCallback((customer) => {
    setSelectedCustomer(customer);
    performanceMonitor.startTimer('customer-select');
  }, []);

  const handleSendMessage = useCallback(async (messageData) => {
    if (!selectedCustomer) return;

    try {
      // 模拟发送消息
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          content: messageData.content,
          type: messageData.type
        })
      });

      if (!response.ok) {
        throw new Error('发送失败');
      }

      // 更新客户消息
      updateCustomer(selectedCustomer.id, {
        lastMessage: messageData.content,
        lastMessageTime: new Date().toISOString()
      });

    } catch (error) {
      console.error('发送消息失败:', error);
    }
  }, [selectedCustomer, updateCustomer]);

  const handleQuickReply = useCallback((reply) => {
    handleSendMessage({ type: 'text', content: reply });
  }, [handleSendMessage]);

  const handleSettingChange = useCallback((key, value) => {
    setSetting(key, value);
  }, [setSetting]);

  // 优化的计算属性
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => customer.status === 'online');
  }, [customers]);

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      const aTime = new Date(a.lastMessageTime || 0);
      const bTime = new Date(b.lastMessageTime || 0);
      return bTime - aTime;
    });
  }, [filteredCustomers]);

  const unreadCount = useMemo(() => {
    return customers.filter(customer => customer.unreadCount > 0).length;
  }, [customers]);

  // 虚拟列表渲染函数
  const renderCustomerItem = useCallback((customer, index) => (
    <div 
      key={customer.id}
      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
        selectedCustomer?.id === customer.id ? 'bg-blue-50 border-blue-200' : ''
      }`}
      onClick={() => handleCustomerSelect(customer)}
    >
      <div className="flex items-center space-x-3">
        <LazyImage
          src={customer.avatar}
          alt={customer.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{customer.name}</p>
          <p className="text-xs text-gray-500 truncate">
            {customer.lastMessage || '暂无消息'}
          </p>
        </div>
        {customer.unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
            {customer.unreadCount}
          </span>
        )}
      </div>
    </div>
  ), [selectedCustomer, handleCustomerSelect]);

  // 如果未登录，显示登录页面
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardBody className="p-6">
            <h2 className="text-2xl font-bold text-center mb-6">客服系统登录</h2>
            <Button 
              color="primary" 
              className="w-full"
              onClick={() => {
                setIsLoggedIn(true);
                setCurrentUser({ id: 1, name: '客服001', avatar: '/avatar.jpg' });
              }}
            >
              登录
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen flex bg-gray-100">
        {/* 左侧客户列表 */}
        <div className={`${isMobile ? 'w-full' : 'w-80'} bg-white border-r border-gray-200 flex flex-col`}>
          {/* 头部 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">客服工作台</h1>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">在线: {filteredCustomers.length}</span>
                <Button
                  size="sm"
                  variant="light"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  设置
                </Button>
              </div>
            </div>
          </div>

          {/* 客户列表 */}
          <div className="flex-1 overflow-hidden">
            {apiLoading ? (
              <div className="flex items-center justify-center p-8">
                <Spinner size="lg" />
              </div>
            ) : apiError ? (
              <div className="p-4 text-center text-red-500">
                <p>加载失败</p>
                <Button size="sm" onClick={refetch}>重试</Button>
              </div>
            ) : (
              <VirtualList
                items={sortedCustomers}
                itemHeight={80}
                itemRenderer={renderCustomerItem}
                className="h-full"
              />
            )}
          </div>
        </div>

        {/* 右侧聊天区域 */}
        <div className="flex-1 flex flex-col">
          {selectedCustomer ? (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Spinner /></div>}>
              <ChatArea
                customer={selectedCustomer}
                onSendMessage={handleSendMessage}
                onQuickReply={handleQuickReply}
                settings={settings}
              />
            </Suspense>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-lg mb-2">选择客户开始对话</p>
                <p className="text-sm">从左侧列表中选择一个客户</p>
              </div>
            </div>
          )}
        </div>

        {/* 设置弹窗 */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardBody className="p-6">
                <h3 className="text-lg font-semibold mb-4">设置</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>声音通知</span>
                    <input
                      type="checkbox"
                      checked={settings.soundNotifications}
                      onChange={(e) => handleSettingChange('soundNotifications', e.target.checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>自动回复</span>
                    <input
                      type="checkbox"
                      checked={settings.autoReply}
                      onChange={(e) => handleSettingChange('autoReply', e.target.checked)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">欢迎消息</label>
                    <textarea
                      value={settings.welcomeMessage}
                      onChange={(e) => handleSettingChange('welcomeMessage', e.target.value)}
                      className="w-full p-2 border rounded"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="light" onClick={() => setIsSettingsOpen(false)}>
                    取消
                  </Button>
                  <Button color="primary" onClick={() => setIsSettingsOpen(false)}>
                    保存
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
});

// 性能监控组件
export const PerformanceMonitor = React.memo(() => {
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded text-xs z-50">
      <h4 className="font-bold mb-2">性能监控</h4>
      {Object.entries(metrics).map(([key, value]) => (
        <div key={key} className="flex justify-between">
          <span>{key}:</span>
          <span>{value.toFixed(2)}ms</span>
        </div>
      ))}
    </div>
  );
});

// 错误边界组件
export const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (error, errorInfo) => {
      setHasError(true);
      setError(error);
      console.error('App Error:', error, errorInfo);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      handleError(event.reason, { type: 'unhandledrejection' });
    });

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardBody className="p-6 text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">应用出现错误</h2>
            <p className="text-gray-600 mb-4">
              {error?.message || '未知错误'}
            </p>
            <Button 
              color="primary"
              onClick={() => window.location.reload()}
            >
              重新加载
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return children;
};