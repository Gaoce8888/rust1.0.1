import React, { useState } from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader,
  ScrollShadow,
  Input,
  Button,
  Divider
} from '@heroui/react';
import { Icon } from '@iconify/react';
import {
  ChatBubble,
  CustomerCard,
  QuickReplyPanel,
  SimpleTypingIndicator,
  FileUploadButton,
  ChatStatistics
} from './components';

/**
 * ExampleIntegration - 示例：如何将新组件集成到聊天应用中
 */
const ExampleIntegration = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      message: '您好，请问有什么可以帮助您的吗？',
      sender: '客服小美',
      avatar: 'https://i.pravatar.cc/150?u=kefu',
      timestamp: new Date(Date.now() - 600000),
      isOwn: true,
      status: 'read',
      type: 'text'
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('1');

  // 模拟客户列表
  const customers = [
    {
      id: '1',
      name: '张三',
      avatar: 'https://i.pravatar.cc/150?u=1',
      lastMessage: '你好，我想咨询一下产品价格',
      lastMessageTime: new Date(),
      unreadCount: 0,
      status: 'online'
    },
    {
      id: '2',
      name: '李四',
      avatar: 'https://i.pravatar.cc/150?u=2',
      lastMessage: '订单什么时候能发货？',
      lastMessageTime: new Date(Date.now() - 3600000),
      unreadCount: 3,
      status: 'offline'
    }
  ];

  // 发送消息
  const sendMessage = (text) => {
    if (!text.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      message: text,
      sender: '客服小美',
      avatar: 'https://i.pravatar.cc/150?u=kefu',
      timestamp: new Date(),
      isOwn: true,
      status: 'sent',
      type: 'text'
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    // 模拟消息状态更新
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
      ));
    }, 1000);

    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'read' } : msg
      ));
    }, 2000);

    // 模拟客户回复
    simulateCustomerReply();
  };

  // 模拟客户回复
  const simulateCustomerReply = () => {
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      const replies = [
        '好的，谢谢您的回复！',
        '明白了，还有其他问题吗？',
        '收到，我会按照您说的去做。',
        '非常感谢您的帮助！'
      ];
      
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      
      const customerMessage = {
        id: messages.length + 2,
        message: randomReply,
        sender: '张三',
        avatar: 'https://i.pravatar.cc/150?u=1',
        timestamp: new Date(),
        isOwn: false,
        type: 'text'
      };
      
      setMessages(prev => [...prev, customerMessage]);
    }, 2000 + Math.random() * 2000);
  };

  // 处理快捷回复
  const handleQuickReply = (text) => {
    sendMessage(text);
  };

  // 处理文件上传
  const handleFileUpload = (files) => {
    files.forEach(file => {
      const fileMessage = {
        id: messages.length + 1,
        message: file.name,
        sender: '客服小美',
        avatar: 'https://i.pravatar.cc/150?u=kefu',
        timestamp: new Date(),
        isOwn: true,
        status: 'sent',
        type: 'file'
      };
      setMessages(prev => [...prev, fileMessage]);
    });
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* 左侧客户列表 */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">客户列表</h2>
          <ScrollShadow className="h-[calc(100vh-120px)]">
            {customers.map(customer => (
              <CustomerCard
                key={customer.id}
                {...customer}
                isActive={selectedCustomer === customer.id}
                onClick={setSelectedCustomer}
              />
            ))}
          </ScrollShadow>
        </div>
      </div>

      {/* 中间聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 聊天头部 */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">张</span>
              </div>
              <div>
                <h3 className="font-semibold">张三</h3>
                <p className="text-xs text-gray-500">在线</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button isIconOnly variant="light" size="sm">
                <Icon icon="ph:phone" className="w-5 h-5" />
              </Button>
              <Button isIconOnly variant="light" size="sm">
                <Icon icon="ph:video-camera" className="w-5 h-5" />
              </Button>
              <Button isIconOnly variant="light" size="sm">
                <Icon icon="ph:info" className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* 聊天消息区域 */}
        <ScrollShadow className="flex-1 p-4 space-y-2">
          {messages.map(msg => (
            <ChatBubble key={msg.id} {...msg} />
          ))}
          <SimpleTypingIndicator isVisible={isTyping} userName="张三" />
        </ScrollShadow>

        {/* 输入区域 */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <FileUploadButton onFileSelect={handleFileUpload} />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputValue)}
              placeholder="输入消息..."
              className="flex-1"
              endContent={
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onClick={() => sendMessage(inputValue)}
                  isDisabled={!inputValue.trim()}
                >
                  <Icon icon="ph:paper-plane-tilt" className="w-5 h-5" />
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* 右侧快捷回复面板 */}
      <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4">
        <QuickReplyPanel onSelectReply={handleQuickReply} />
        
        <Divider className="my-4" />
        
        {/* 简化的统计信息 */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold">今日统计</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">总对话数</span>
                <span className="font-semibold">23</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">已解决</span>
                <span className="font-semibold text-success">18</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">平均响应</span>
                <span className="font-semibold">2.5分钟</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default ExampleIntegration;