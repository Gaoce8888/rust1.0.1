import React, { useState } from 'react';
import { Button, Card, CardBody } from "@heroui/react";
import {
  MessageBubble,
  UserAvatar,
  StatusIndicator,
  LoadingSpinner,
  Notification,
  ConnectionStatus,
  OnlineStatus,
  LoadingType,
  NotificationType
} from './index';

/**
 * 使用示例组件
 * 展示如何在现有应用中集成新组件
 */
export default function UsageExample() {
  const [showNotification, setShowNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 模拟消息数据
  const sampleMessage = {
    content: '这是一个示例消息，展示了如何使用MessageBubble组件。',
    type: 'text',
    timestamp: new Date(),
    sender: { name: '示例用户', username: 'example' },
    status: 'read'
  };

  // 模拟用户数据
  const sampleUser = {
    id: '1',
    name: '示例用户',
    username: 'example',
    status: 'online',
    isOnline: true
  };

  const handleShowNotification = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 3000);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">组件使用示例</h2>
      
      {/* 消息气泡示例 */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-3">消息气泡组件</h3>
          <MessageBubble 
            message={sampleMessage}
            isOwn={false}
            showAvatar={true}
            showTime={true}
          />
        </CardBody>
      </Card>

      {/* 用户头像示例 */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-3">用户头像组件</h3>
          <div className="flex gap-4">
            <UserAvatar user={sampleUser} size="lg" showStatus={true} />
            <div>
              <p className="text-sm text-default-500">支持在线状态显示</p>
              <p className="text-sm text-default-500">可自定义大小和样式</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 状态指示器示例 */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-3">状态指示器组件</h3>
          <div className="flex gap-4">
            <StatusIndicator status={ConnectionStatus.CONNECTED} type="connection" />
            <StatusIndicator status={OnlineStatus.ONLINE} type="online" />
            <StatusIndicator status="custom" type="message" showText={false} />
          </div>
        </CardBody>
      </Card>

      {/* 加载动画示例 */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-3">加载动画组件</h3>
          <div className="flex gap-4 items-center">
            <LoadingSpinner type={LoadingType.DOTS} />
            <Button onClick={handleLoadingDemo} disabled={isLoading}>
              {isLoading ? '加载中...' : '演示加载'}
            </Button>
          </div>
          {isLoading && (
            <div className="mt-4">
              <LoadingSpinner 
                type={LoadingType.SPINNER} 
                text="正在处理请求..." 
                overlay={true}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* 通知示例 */}
      <Card>
        <CardBody>
          <h3 className="text-lg font-semibold mb-3">通知组件</h3>
          <Button 
            color="primary" 
            onClick={handleShowNotification}
          >
            显示通知
          </Button>
        </CardBody>
      </Card>

      {/* 显示通知 */}
      {showNotification && (
        <Notification
          type={NotificationType.SUCCESS}
          title="成功"
          message="这是一个成功通知示例！"
          duration={3000}
          position="top-right"
        />
      )}
    </div>
  );
}

// 在现有App.jsx中的集成示例
export function AppIntegrationExample() {
  const [connectionStatus, setConnectionStatus] = useState(ConnectionStatus.DISCONNECTED);
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 模拟连接状态变化
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setConnectionStatus(ConnectionStatus.CONNECTED);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen">
      {/* 侧边栏 */}
      <div className="w-64 bg-default-50 border-r border-default-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          {currentUser && (
            <UserAvatar 
              user={currentUser} 
              size="md" 
              showStatus={true}
            />
          )}
          <div>
            <div className="font-medium">{currentUser?.name || '未登录'}</div>
            <StatusIndicator 
              status={connectionStatus} 
              type="connection" 
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 消息列表 */}
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender?.id === currentUser?.id}
            />
          ))}
          {isLoading && (
            <div className="flex justify-center py-4">
              <LoadingSpinner type={LoadingType.DOTS} text="加载消息中..." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}