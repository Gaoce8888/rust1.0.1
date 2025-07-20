import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Button, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";
import {
  MessageBubble,
  UserAvatar,
  StatusIndicator,
  LoadingSpinner,
  Notification,
  NotificationManager,
  ConnectionStatus,
  OnlineStatus,
  MessageStatus,
  LoadingType,
  NotificationType
} from './index';

/**
 * 组件展示页面
 * 展示所有新创建的组件的使用方法
 */
export default function ComponentShowcase() {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('info');

  // 示例消息数据
  const sampleMessages = [
    {
      id: 1,
      content: '您好！请问有什么可以帮助您的吗？',
      type: 'text',
      timestamp: new Date(),
      sender: { name: '客服小王', username: 'kefu001' },
      status: 'read'
    },
    {
      id: 2,
      content: '我想咨询一下产品价格',
      type: 'text',
      timestamp: new Date(Date.now() - 60000),
      sender: { name: '客户张三', username: 'customer001' }
    },
    {
      id: 3,
      content: 'https://example.com/image.jpg',
      type: 'image',
      timestamp: new Date(Date.now() - 120000),
      sender: { name: '客户张三', username: 'customer001' }
    }
  ];

  // 示例用户数据
  const sampleUsers = [
    { id: '1', name: '客服小王', username: 'kefu001', status: 'online', isOnline: true },
    { id: '2', name: '客户张三', username: 'customer001', status: 'online', isOnline: true },
    { id: '3', name: '客户李四', username: 'customer002', status: 'away', isOnline: false },
    { id: '4', name: '客户王五', username: 'customer003', status: 'offline', isOnline: false }
  ];

  const handleShowNotification = (type) => {
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">组件展示</h1>
        <p className="text-default-500">展示所有新创建的前端组件</p>
      </div>

      {/* 消息气泡组件 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">消息气泡组件 (MessageBubble)</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="space-y-2">
            {sampleMessages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={index === 0}
                showAvatar={true}
                showTime={true}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* 用户头像组件 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">用户头像组件 (UserAvatar)</h2>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-4">
            {sampleUsers.map(user => (
              <div key={user.id} className="text-center">
                <UserAvatar user={user} size="lg" showStatus={true} />
                <div className="text-sm text-default-500 mt-2">{user.name}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* 状态指示器组件 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">状态指示器组件 (StatusIndicator)</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">连接状态</h3>
              <div className="flex gap-2">
                <StatusIndicator status={ConnectionStatus.CONNECTED} type="connection" />
                <StatusIndicator status={ConnectionStatus.CONNECTING} type="connection" />
                <StatusIndicator status={ConnectionStatus.DISCONNECTED} type="connection" />
                <StatusIndicator status={ConnectionStatus.ERROR} type="connection" />
              </div>
            </div>
            
            <Divider />
            
            <div>
              <h3 className="text-lg font-medium mb-2">在线状态</h3>
              <div className="flex gap-2">
                <StatusIndicator status={OnlineStatus.ONLINE} type="online" />
                <StatusIndicator status={OnlineStatus.OFFLINE} type="online" />
                <StatusIndicator status={OnlineStatus.AWAY} type="online" />
                <StatusIndicator status={OnlineStatus.BUSY} type="online" />
              </div>
            </div>
            
            <Divider />
            
            <div>
              <h3 className="text-lg font-medium mb-2">消息状态</h3>
              <div className="flex gap-2">
                <StatusIndicator status={MessageStatus.SENT} type="message" />
                <StatusIndicator status={MessageStatus.SENDING} type="message" />
                <StatusIndicator status={MessageStatus.DELIVERED} type="message" />
                <StatusIndicator status={MessageStatus.READ} type="message" />
                <StatusIndicator status={MessageStatus.FAILED} type="message" />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 加载动画组件 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">加载动画组件 (LoadingSpinner)</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">不同类型的加载动画</h3>
              <div className="flex gap-4">
                <div className="text-center">
                  <LoadingSpinner type={LoadingType.SPINNER} />
                  <div className="text-sm text-default-500 mt-2">Spinner</div>
                </div>
                <div className="text-center">
                  <LoadingSpinner type={LoadingType.DOTS} />
                  <div className="text-sm text-default-500 mt-2">Dots</div>
                </div>
                <div className="text-center">
                  <LoadingSpinner type={LoadingType.PULSE} />
                  <div className="text-sm text-default-500 mt-2">Pulse</div>
                </div>
                <div className="text-center">
                  <LoadingSpinner type={LoadingType.RING} />
                  <div className="text-sm text-default-500 mt-2">Ring</div>
                </div>
                <div className="text-center">
                  <LoadingSpinner type={LoadingType.BARS} />
                  <div className="text-sm text-default-500 mt-2">Bars</div>
                </div>
                <div className="text-center">
                  <LoadingSpinner type={LoadingType.CUSTOM} />
                  <div className="text-sm text-default-500 mt-2">Custom</div>
                </div>
              </div>
            </div>
            
            <Divider />
            
            <div>
              <h3 className="text-lg font-medium mb-2">不同尺寸</h3>
              <div className="flex gap-4 items-center">
                <LoadingSpinner size="sm" />
                <LoadingSpinner size="md" />
                <LoadingSpinner size="lg" />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 通知组件 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">通知组件 (Notification)</h2>
        </CardHeader>
        <CardBody>
          <div className="flex gap-2">
            <Button 
              color="success" 
              onClick={() => handleShowNotification(NotificationType.SUCCESS)}
            >
              成功通知
            </Button>
            <Button 
              color="danger" 
              onClick={() => handleShowNotification(NotificationType.ERROR)}
            >
              错误通知
            </Button>
            <Button 
              color="warning" 
              onClick={() => handleShowNotification(NotificationType.WARNING)}
            >
              警告通知
            </Button>
            <Button 
              color="primary" 
              onClick={() => handleShowNotification(NotificationType.INFO)}
            >
              信息通知
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* 显示通知 */}
      {showNotification && (
        <Notification
          type={notificationType}
          title={
            notificationType === 'success' ? '成功' :
            notificationType === 'error' ? '错误' :
            notificationType === 'warning' ? '警告' : '提示'
          }
          message={
            notificationType === 'success' ? '操作成功完成！' :
            notificationType === 'error' ? '操作失败，请重试。' :
            notificationType === 'warning' ? '请注意这个警告信息。' : '这是一条信息提示。'
          }
          duration={3000}
          position="top-right"
        />
      )}
    </div>
  );
}