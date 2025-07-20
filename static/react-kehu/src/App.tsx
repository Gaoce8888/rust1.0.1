import React, { useState, useEffect } from 'react';
import { HeroUIProvider } from '@heroui/react';
import { Icon } from '@iconify/react';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Avatar, 
  Input, 
  Button, 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  Select, 
  SelectItem,
  Chip,
  Tooltip,
  Divider
} from '@heroui/react';

// 导入企业级适配器
import { useEnterpriseAdapter, useMessages, User, Message } from '../services/enterprise-adapter';

// 配置
const CONFIG = {
  apiUrl: 'http://localhost:6006',
  wsUrl: 'ws://localhost:6006/ws',
  debug: true,
  autoReconnect: true,
  reconnectInterval: 5000
};

// 主应用组件
export default function App() {
  const { adapter, isConnected, currentUser, login, logout } = useEnterpriseAdapter(CONFIG);
  const [showLogin, setShowLogin] = useState(!currentUser);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  // 自动显示登录界面
  useEffect(() => {
    if (!currentUser) {
      setShowLogin(true);
    }
  }, [currentUser]);

  return (
    <HeroUIProvider>
      <div className="h-screen bg-background">
        {/* 连接状态指示器 */}
        <ConnectionStatus isConnected={isConnected} onLogout={logout} />
        
        {/* 主界面 */}
        {currentUser ? (
          <ChatInterface 
            user={currentUser} 
            adapter={adapter}
            selectedChat={selectedChat}
            onSelectChat={setSelectedChat}
          />
        ) : (
          <LoginModal 
            isOpen={showLogin} 
            onLogin={login}
            onClose={() => setShowLogin(false)}
          />
        )}
      </div>
    </HeroUIProvider>
  );
}

// 登录组件
function LoginModal({ isOpen, onLogin, onClose }: {
  isOpen: boolean;
  onLogin: (username: string, password: string, role: string) => Promise<User>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'customer'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!formData.username || !formData.password) {
      setError('请填写用户名和密码');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onLogin(formData.username, formData.password, formData.role);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isDismissable={false} size="md">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Icon icon="solar:chat-round-dots-bold" className="text-primary" width={24} />
            <span>登录客服系统</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              label="用户名"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              placeholder="输入用户名"
              startContent={<Icon icon="solar:user-linear" width={20} />}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <Input
              label="密码"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="输入密码"
              startContent={<Icon icon="solar:lock-linear" width={20} />}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <Select
              label="选择角色"
              selectedKeys={[formData.role]}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              startContent={<Icon icon="solar:user-id-linear" width={20} />}
            >
              <SelectItem key="customer" value="customer">客户</SelectItem>
              <SelectItem key="support" value="support">客服</SelectItem>
            </Select>
            {error && (
              <Chip color="danger" variant="flat" className="w-full">
                {error}
              </Chip>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="light" onPress={onClose}>
            取消
          </Button>
          <Button color="primary" onPress={handleLogin} isLoading={loading}>
            登录
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// 聊天界面组件
function ChatInterface({ 
  user, 
  adapter, 
  selectedChat, 
  onSelectChat 
}: {
  user: User;
  adapter: any;
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
}) {
  // 默认与客服对话
  const targetUserId = user.role === 'customer' ? 'support_001' : 'customer_001';
  const { messages, sendMessage, loading } = useMessages(targetUserId);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (inputText.trim() && !isTyping) {
      setIsTyping(true);
      try {
        await sendMessage(inputText);
        setInputText('');
      } catch (error) {
        console.error('发送失败:', error);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[90vh]">
        {/* 聊天头部 */}
        <CardHeader className="flex gap-3 px-6 py-4 border-b">
          <Avatar 
            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
            size="md"
          />
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2">
              <p className="text-md font-semibold">
                {user.role === 'customer' ? '客服助手' : '客户'}
              </p>
              <Chip 
                size="sm" 
                color="success" 
                variant="flat"
                startContent={<div className="w-2 h-2 bg-success rounded-full" />}
              >
                在线
              </Chip>
            </div>
            <p className="text-sm text-default-500">
              {user.role === 'customer' ? '专业客服为您服务' : '客户咨询'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content="设置">
              <Button isIconOnly size="sm" variant="light">
                <Icon icon="solar:settings-linear" width={20} />
              </Button>
            </Tooltip>
            <Tooltip content="更多">
              <Button isIconOnly size="sm" variant="light">
                <Icon icon="solar:menu-dots-linear" width={20} />
              </Button>
            </Tooltip>
          </div>
        </CardHeader>

        {/* 消息列表 */}
        <CardBody className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="flex items-center gap-2 text-default-500">
                <Icon icon="solar:loading-linear" className="animate-spin" width={20} />
                <span>加载中...</span>
              </div>
            </div>
          )}
          
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === user.id} />
          ))}
          
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon icon="solar:chat-round-dots-bold" className="text-default-300 mb-4" width={48} />
              <p className="text-default-500 mb-2">开始您的对话</p>
              <p className="text-sm text-default-400">发送消息开始与客服交流</p>
            </div>
          )}
        </CardBody>

        <Divider />

        {/* 输入区域 */}
        <div className="border-t px-6 py-4">
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              variant="bordered"
              startContent={
                <Button isIconOnly size="sm" variant="light">
                  <Icon icon="solar:paperclip-linear" width={20} />
                </Button>
              }
              endContent={
                <div className="flex gap-2">
                  <Button isIconOnly size="sm" variant="light">
                    <Icon icon="solar:emoji-linear" width={20} />
                  </Button>
                  <Button 
                    isIconOnly 
                    size="sm" 
                    color="primary"
                    onPress={handleSend}
                    isLoading={isTyping}
                    isDisabled={!inputText.trim()}
                  >
                    <Icon icon="solar:plain-2-bold" width={20} />
                  </Button>
                </div>
              }
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-default-400">
              按 Enter 发送，Shift + Enter 换行
            </p>
            <div className="flex items-center gap-2 text-xs text-default-400">
              <Icon icon="solar:shield-check-linear" width={14} />
              <span>端到端加密</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// 消息气泡组件
function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
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
              : 'bg-muted text-foreground'
          }`}
        >
          <p className="text-small whitespace-pre-wrap">{message.text}</p>
        </div>
        <div className={`flex items-center gap-1 mt-1 px-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <p className="text-tiny text-default-400">
            {message.time}
          </p>
          {isOwn && (
            <div className="flex items-center gap-1">
              {message.status === 'sent' && <Icon icon="solar:check-linear" width={12} />}
              {message.status === 'read' && <Icon icon="solar:check-double-linear" width={12} />}
              {message.status === 'error' && <Icon icon="solar:close-circle-linear" width={12} className="text-danger" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 连接状态组件
function ConnectionStatus({ isConnected, onLogout }: { isConnected: boolean; onLogout: () => void }) {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
      <Chip 
        size="sm"
        color={isConnected ? "success" : "danger"}
        variant="flat"
        startContent={
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`} />
        }
      >
        {isConnected ? '已连接' : '未连接'}
      </Chip>
      <Button size="sm" variant="light" color="danger" onPress={onLogout}>
        <Icon icon="solar:logout-linear" width={16} />
        退出
      </Button>
    </div>
  );
}