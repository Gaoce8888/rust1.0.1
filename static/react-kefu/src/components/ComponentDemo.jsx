import React, { useState } from 'react';
import {
  Button,
  Input,
  Modal,
  Card,
  Toast,
  Loading,
  Avatar,
  Badge,
  StatusBadge,
  NumberBadge
} from './UI';
import ChatMessage from './ChatMessage';
import CustomerCard from './CustomerCard';
import ChatInput from './ChatInput';

const ComponentDemo = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // 示例数据
  const sampleCustomer = {
    id: '1',
    name: '张三',
    avatar: '/avatar.jpg',
    email: 'zhangsan@example.com',
    phone: '13812345678',
    location: '北京市朝阳区',
    status: 'online',
    priority: 'high',
    isVip: true,
    unreadCount: 3,
    tags: ['VIP客户', '重要', '新客户'],
    lastMessage: {
      type: 'text',
      content: '你好，我需要帮助'
    },
    lastSeenAt: new Date().toISOString()
  };

  const sampleMessage = {
    id: '1',
    content: '你好！很高兴为您服务，请问有什么可以帮助您的吗？',
    type: 'text',
    timestamp: new Date().toISOString(),
    senderName: '客服小王',
    senderRole: '客服',
    avatar: '/avatar.jpg',
    status: 'read'
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">组件演示</h1>

      {/* 按钮组件 */}
      <Card title="Button 按钮组件" className="mb-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">主要按钮</Button>
            <Button variant="secondary">次要按钮</Button>
            <Button variant="success">成功按钮</Button>
            <Button variant="danger">危险按钮</Button>
            <Button variant="warning">警告按钮</Button>
            <Button variant="outline">边框按钮</Button>
            <Button variant="ghost">幽灵按钮</Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button size="small">小按钮</Button>
            <Button size="medium">中按钮</Button>
            <Button size="large">大按钮</Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button isLoading>加载中</Button>
            <Button isDisabled>禁用状态</Button>
            <Button 
              leftIcon={<span>📧</span>}
              rightIcon={<span>→</span>}
            >
              带图标
            </Button>
          </div>
        </div>
      </Card>

      {/* 输入框组件 */}
      <Card title="Input 输入组件" className="mb-6">
        <div className="space-y-4 max-w-md">
          <Input
            label="基本输入"
            placeholder="请输入内容"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          
          <Input
            label="带错误的输入"
            placeholder="请输入邮箱"
            type="email"
            error="请输入有效的邮箱地址"
          />
          
          <Input
            label="带帮助文本"
            placeholder="请输入密码"
            type="password"
            helpText="密码至少8位，包含字母和数字"
          />
          
          <Input
            label="带图标的输入"
            placeholder="搜索"
            leftIcon={<span>🔍</span>}
            rightIcon={<span>❌</span>}
          />
        </div>
      </Card>

      {/* 卡片组件 */}
      <Card title="Card 卡片组件" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card 
            title="基本卡片" 
            subtitle="这是一个基本的卡片组件"
          >
            <p>卡片内容区域</p>
          </Card>
          
          <Card 
            title="可悬停卡片" 
            hoverable
            footer={<Button size="small">操作</Button>}
          >
            <p>鼠标悬停时会有阴影效果</p>
          </Card>
          
          <Card 
            title="可点击卡片" 
            clickable
            onClick={() => alert('卡片被点击')}
          >
            <p>点击这个卡片试试</p>
          </Card>
        </div>
      </Card>

      {/* 头像组件 */}
      <Card title="Avatar 头像组件" className="mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar name="张三" size="small" />
            <Avatar name="李四" size="medium" status="online" />
            <Avatar name="王五" size="large" status="away" />
            <Avatar name="赵六" size="xl" status="busy" />
          </div>
          
          <div className="flex items-center gap-4">
            <Avatar src="/avatar1.jpg" name="用户1" showBorder />
            <Avatar name="AB" shape="square" />
            <Avatar name="CD" shape="rounded" />
          </div>
        </div>
      </Card>

      {/* 徽章组件 */}
      <Card title="Badge 徽章组件" className="mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge content="新" color="danger">
              <Button>消息</Button>
            </Badge>
            
            <NumberBadge count={5}>
              <Button>通知</Button>
            </NumberBadge>
            
            <Badge dot color="success">
              <Avatar name="在线用户" />
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <StatusBadge status="online" />
            <StatusBadge status="offline" />
            <StatusBadge status="away" />
            <StatusBadge status="busy" />
          </div>
        </div>
      </Card>

      {/* 加载组件 */}
      <Card title="Loading 加载组件" className="mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Loading size="small" />
            <Loading size="medium" text="加载中..." />
            <Loading size="large" type="dots" />
            <Loading type="pulse" color="success" />
          </div>
        </div>
      </Card>

      {/* 客户卡片组件 */}
      <Card title="CustomerCard 客户卡片组件" className="mb-6">
        <div className="max-w-md">
          <CustomerCard
            customer={sampleCustomer}
            onMessage={(customer) => alert(`给 ${customer.name} 发送消息`)}
            onCall={(customer) => alert(`拨打 ${customer.name} 的电话`)}
          />
        </div>
      </Card>

      {/* 聊天消息组件 */}
      <Card title="ChatMessage 聊天消息组件" className="mb-6">
        <div className="space-y-4 max-w-2xl">
          <ChatMessage
            message={sampleMessage}
            isOwn={false}
            onQuote={(msg) => alert('引用消息: ' + msg.content)}
          />
          
          <ChatMessage
            message={{
              ...sampleMessage,
              content: '好的，我明白了，谢谢！',
              senderName: '客户',
              status: 'sent'
            }}
            isOwn={true}
          />
        </div>
      </Card>

      {/* 聊天输入组件 */}
      <Card title="ChatInput 聊天输入组件" className="mb-6">
        <div className="max-w-2xl">
          <ChatInput
            value={chatMessage}
            onChange={setChatMessage}
            onSend={(message) => {
              alert('发送消息: ' + message);
              setChatMessage('');
            }}
            onFileUpload={(file, type) => {
              alert(`上传${type}: ${file.name}`);
            }}
            placeholder="输入您的消息..."
          />
        </div>
      </Card>

      {/* 模态框和Toast */}
      <Card title="Modal & Toast 组件" className="mb-6">
        <div className="space-x-4">
          <Button onClick={() => setIsModalOpen(true)}>
            打开模态框
          </Button>
          
          <Button onClick={() => setShowToast(true)}>
            显示Toast
          </Button>
        </div>
      </Card>

      {/* 模态框 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="示例模态框"
        onConfirm={() => {
          alert('确认操作');
          setIsModalOpen(false);
        }}
        onCancel={() => setIsModalOpen(false)}
      >
        <p>这是一个示例模态框的内容。您可以在这里放置任何内容。</p>
      </Modal>

      {/* Toast */}
      {showToast && (
        <Toast
          message="这是一个成功消息！"
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

export default ComponentDemo;