import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Divider, Button } from '@heroui/react';
import {
  ChatBubble,
  CustomerCard,
  QuickReplyPanel,
  TypingIndicator,
  SimpleTypingIndicator,
  FileUploadButton,
  ChatStatistics
} from './components';

/**
 * ComponentsDemo - 组件演示页面
 * 展示所有新构建的前端组件
 */
const ComponentsDemo = () => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showTyping, setShowTyping] = useState(true);
  const [quickReplyCollapsed, setQuickReplyCollapsed] = useState(false);

  // 模拟客户数据
  const mockCustomers = [
    {
      id: '1',
      name: '张三',
      avatar: 'https://i.pravatar.cc/150?u=1',
      lastMessage: '你好，我想咨询一下产品价格',
      lastMessageTime: new Date(),
      unreadCount: 2,
      status: 'online',
      tags: ['VIP', '企业客户'],
      priority: 'high'
    },
    {
      id: '2',
      name: '李四',
      avatar: 'https://i.pravatar.cc/150?u=2',
      lastMessage: '订单什么时候能发货？',
      lastMessageTime: new Date(Date.now() - 3600000),
      unreadCount: 0,
      status: 'offline',
      tags: ['普通客户'],
      priority: 'normal'
    },
    {
      id: '3',
      name: '王五',
      avatar: 'https://i.pravatar.cc/150?u=3',
      lastMessage: '感谢你的帮助！',
      lastMessageTime: new Date(Date.now() - 86400000),
      unreadCount: 0,
      status: 'busy',
      tags: ['新客户', '待跟进'],
      priority: 'low'
    }
  ];

  // 模拟消息数据
  const mockMessages = [
    {
      message: '你好，我想咨询一下你们的产品价格',
      sender: '张三',
      avatar: 'https://i.pravatar.cc/150?u=1',
      timestamp: new Date(Date.now() - 300000),
      isOwn: false,
      status: 'read',
      type: 'text'
    },
    {
      message: '您好！很高兴为您服务。我们的产品价格根据不同的套餐有所区别，请问您对哪个产品感兴趣呢？',
      sender: '客服小美',
      avatar: 'https://i.pravatar.cc/150?u=kefu',
      timestamp: new Date(Date.now() - 240000),
      isOwn: true,
      status: 'read',
      type: 'text'
    },
    {
      message: 'https://via.placeholder.com/300x200',
      sender: '张三',
      avatar: 'https://i.pravatar.cc/150?u=1',
      timestamp: new Date(Date.now() - 180000),
      isOwn: false,
      status: 'read',
      type: 'image'
    },
    {
      message: '产品介绍.pdf',
      sender: '客服小美',
      avatar: 'https://i.pravatar.cc/150?u=kefu',
      timestamp: new Date(Date.now() - 120000),
      isOwn: true,
      status: 'delivered',
      type: 'file'
    }
  ];

  // 模拟统计数据
  const mockStats = {
    totalConversations: 156,
    activeConversations: 23,
    totalMessages: 1892,
    avgResponseTime: '2.5分钟',
    satisfaction: 95,
    todayConversations: 45,
    resolvedToday: 38,
    pendingConversations: 7
  };

  const handleFileSelect = (files) => {
    console.log('选择的文件:', files);
    alert(`已选择 ${files.length} 个文件`);
  };

  const handleQuickReply = (text) => {
    console.log('选择的快捷回复:', text);
    alert(`已选择快捷回复: ${text}`);
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">客服系统组件展示</h1>

      {/* 聊天气泡组件 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">聊天气泡组件 (ChatBubble)</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            {mockMessages.map((msg, index) => (
              <ChatBubble key={index} {...msg} />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* 客户卡片组件 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">客户卡片组件 (CustomerCard)</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockCustomers.map(customer => (
              <CustomerCard
                key={customer.id}
                {...customer}
                isActive={selectedCustomer === customer.id}
                onClick={setSelectedCustomer}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* 打字指示器组件 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold">打字指示器组件 (TypingIndicator)</h2>
            <Button
              size="sm"
              variant="flat"
              onClick={() => setShowTyping(!showTyping)}
            >
              {showTyping ? '隐藏' : '显示'}
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">带动画效果（需要 framer-motion）:</p>
              <TypingIndicator isVisible={showTyping} userName="张三" size="md" />
            </div>
            <Divider />
            <div>
              <p className="text-sm text-gray-600 mb-2">简化版（纯 CSS 动画）:</p>
              <SimpleTypingIndicator isVisible={showTyping} userName="李四" size="lg" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 文件上传按钮组件 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">文件上传按钮组件 (FileUploadButton)</h2>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-4">
            <FileUploadButton
              onFileSelect={handleFileSelect}
              variant="flat"
              size="md"
            />
            <span className="text-sm text-gray-600">点击上传文件（支持图片、PDF、文档等）</span>
          </div>
        </CardBody>
      </Card>

      {/* 快捷回复面板组件 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">快捷回复面板组件 (QuickReplyPanel)</h2>
        </CardHeader>
        <CardBody>
          <div className="flex justify-center">
            <QuickReplyPanel
              onSelectReply={handleQuickReply}
              isCollapsed={quickReplyCollapsed}
              onToggleCollapse={() => setQuickReplyCollapsed(!quickReplyCollapsed)}
            />
          </div>
        </CardBody>
      </Card>

      {/* 聊天统计组件 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">聊天统计组件 (ChatStatistics)</h2>
        </CardHeader>
        <CardBody>
          <ChatStatistics stats={mockStats} />
        </CardBody>
      </Card>
    </div>
  );
};

export default ComponentsDemo;