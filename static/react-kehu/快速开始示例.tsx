// 快速开始示例 - 完整的聊天应用
import React, { useState, useEffect } from 'react';
import { NextUIProvider, Card, CardBody, CardHeader, Avatar, Input, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem } from '@nextui-org/react';
import { Icon } from '@iconify/react';

// ========== Step 1: 导入企业级适配器 ==========
import { EnterpriseAdapter, useEnterpriseAdapter, useMessages } from './services/enterprise-adapter';

// ========== Step 2: 配置后端连接 ==========
const CONFIG = {
  apiUrl: 'http://localhost:6006',
  wsUrl: 'ws://localhost:6006/ws',
  debug: true,
  autoReconnect: true
};

// ========== Step 3: 创建主应用组件 ==========
export default function QuickStartApp() {
  const { adapter, isConnected, currentUser, login, logout } = useEnterpriseAdapter(CONFIG);
  const [showLogin, setShowLogin] = useState(!currentUser);

  return (
    <NextUIProvider>
      <div className="h-screen bg-background">
        {/* 连接状态指示器 */}
        <ConnectionStatus isConnected={isConnected} onLogout={logout} />
        
        {/* 主界面 */}
        {currentUser ? (
          <ChatInterface user={currentUser} adapter={adapter} />
        ) : (
          <LoginModal 
            isOpen={showLogin} 
            onLogin={login}
            onClose={() => setShowLogin(false)}
          />
        )}
      </div>
    </NextUIProvider>
  );
}

// ========== Step 4: 登录组件 ==========
function LoginModal({ isOpen, onLogin, onClose }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'customer'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      await onLogin(formData.username, formData.password, formData.role);
      onClose();
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isDismissable={false}>
      <ModalContent>
        <ModalHeader>登录聊天系统</ModalHeader>
        <ModalBody>
          <Input
            label="用户名"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            placeholder="输入用户名"
          />
          <Input
            label="密码"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            placeholder="输入密码"
          />
          <Select
            label="选择角色"
            selectedKeys={[formData.role]}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
          >
            <SelectItem key="customer" value="customer">客户</SelectItem>
            <SelectItem key="support" value="support">客服</SelectItem>
          </Select>
          {error && <p className="text-danger text-sm">{error}</p>}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onPress={handleLogin} isLoading={loading}>
            登录
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ========== Step 5: 聊天界面组件 ==========
function ChatInterface({ user, adapter }) {
  // 假设与默认客服对话
  const targetUserId = user.role === 'customer' ? 'support_001' : 'customer_001';
  const { messages, sendMessage, loading } = useMessages(targetUserId);
  const [inputText, setInputText] = useState('');

  const handleSend = async () => {
    if (inputText.trim()) {
      try {
        await sendMessage(inputText);
        setInputText('');
      } catch (error) {
        console.error('发送失败:', error);
      }
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[90vh]">
        {/* 聊天头部 */}
        <CardHeader className="flex gap-3 px-6 py-4 border-b">
          <Avatar src={user.avatar} />
          <div className="flex flex-col">
            <p className="text-md font-semibold">{user.name}</p>
            <p className="text-sm text-default-500">
              {user.role === 'customer' ? '客户' : '客服'} · 在线
            </p>
          </div>
        </CardHeader>

        {/* 消息列表 */}
        <CardBody className="flex-1 overflow-y-auto px-6 py-4">
          {loading && <p className="text-center text-default-500">加载中...</p>}
          
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === user.id} />
          ))}
          
          {messages.length === 0 && !loading && (
            <p className="text-center text-default-500">暂无消息，开始对话吧！</p>
          )}
        </CardBody>

        {/* 输入区域 */}
        <div className="border-t px-6 py-4">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入消息..."
            endContent={
              <div className="flex gap-2">
                <Button isIconOnly size="sm" variant="light">
                  <Icon icon="solar:paperclip-linear" width={20} />
                </Button>
                <Button 
                  isIconOnly 
                  size="sm" 
                  color="primary"
                  onPress={handleSend}
                >
                  <Icon icon="solar:plain-2-bold" width={20} />
                </Button>
              </div>
            }
          />
        </div>
      </Card>
    </div>
  );
}

// ========== Step 6: 消息气泡组件 ==========
function MessageBubble({ message, isOwn }) {
  return (
    <div className={`flex gap-3 mb-4 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar 
        src={message.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.senderId}`} 
        size="sm" 
      />
      <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-2xl px-4 py-2 ${
            isOwn 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-content2'
          }`}
        >
          <p className="text-small">{message.text}</p>
        </div>
        <p className="text-tiny text-default-400 mt-1 px-2">
          {message.time}
          {isOwn && message.status === 'sent' && ' ✓'}
          {isOwn && message.status === 'read' && ' ✓✓'}
        </p>
      </div>
    </div>
  );
}

// ========== Step 7: 连接状态组件 ==========
function ConnectionStatus({ isConnected, onLogout }) {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`} />
        <span className="text-sm text-default-500">
          {isConnected ? '已连接' : '未连接'}
        </span>
      </div>
      <Button size="sm" variant="light" color="danger" onPress={onLogout}>
        退出
      </Button>
    </div>
  );
}

// ========== 使用说明 ==========
/*
1. 确保后端服务运行在 http://localhost:6006
2. 安装依赖: npm install
3. 启动应用: npm run dev
4. 访问 http://localhost:8004/quick-start.html
5. 使用测试账号登录并开始聊天

特性:
- ✅ 自动重连
- ✅ 消息状态跟踪
- ✅ 实时在线状态
- ✅ 文件上传支持（点击回形针图标）
- ✅ 响应式设计
*/ 