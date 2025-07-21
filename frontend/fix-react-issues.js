#!/usr/bin/env node

/**
 * React项目问题修复脚本
 * 自动修复一些常见的React问题
 */

const fs = require('fs');
const path = require('path');

// 修复状态直接修改问题
function fixStateMutations() {
  console.log('🔧 修复状态直接修改问题...');
  
  const appJsxPath = path.join(__dirname, 'kefu-app/src/App.jsx');
  let content = fs.readFileSync(appJsxPath, 'utf8');
  
  // 修复 updatedCustomers.push 问题
  content = content.replace(
    /updatedCustomers\.push\(\{[\s\S]*?\}\);/g,
    (match) => {
      const newCustomer = match.replace('updatedCustomers.push(', '').replace(');', '');
      return `updatedCustomers = [...updatedCustomers, ${newCustomer}];`;
    }
  );
  
  // 修复 initialMessages.push 问题
  content = content.replace(
    /initialMessages\.push\(\{[\s\S]*?\}\);/g,
    (match) => {
      const newMessage = match.replace('initialMessages.push(', '').replace(');', '');
      return `initialMessages = [...initialMessages, ${newMessage}];`;
    }
  );
  
  fs.writeFileSync(appJsxPath, content);
  console.log('✅ 状态修改问题已修复');
}

// 修复key属性问题
function fixKeyProps() {
  console.log('🔧 修复key属性问题...');
  
  const appJsxPath = path.join(__dirname, 'kefu-app/src/App.jsx');
  let content = fs.readFileSync(appJsxPath, 'utf8');
  
  // 修复快捷回复的key
  content = content.replace(
    /key=\{index\}/g,
    'key={`quick-reply-${reply.substring(0, 10)}-${index}`}'
  );
  
  // 修复设置中快捷回复的key
  content = content.replace(
    /key=\{index \+ 3\}/g,
    'key={`settings-reply-${reply.substring(0, 10)}-${index + 3}`}'
  );
  
  fs.writeFileSync(appJsxPath, content);
  console.log('✅ Key属性问题已修复');
}

// 创建优化的组件
function createOptimizedComponents() {
  console.log('🔧 创建优化的组件...');
  
  // 创建CustomerList组件
  const customerListComponent = `import React from 'react';
import { Avatar, Badge, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';

export const CustomerList = React.memo(({ customers, currentCustomer, onSelect }) => {
  return (
    <div className="space-y-2">
      {customers.map((customer) => (
        <div
          key={customer.id}
          className={\`p-3 rounded-lg cursor-pointer transition-colors \${
            currentCustomer?.id === customer.id
              ? 'bg-primary/10 border border-primary/20'
              : 'hover:bg-default-100'
          }\`}
          onClick={() => onSelect(customer)}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                size="sm"
                src={customer.avatar}
                name={customer.name}
              />
              <div className={\`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background \${
                customer.status === 'online' ? 'bg-success' : 'bg-default-300'
              }\`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-small font-medium truncate">{customer.name}</p>
                <span className="text-tiny text-default-400">
                  {new Date(customer.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-tiny text-default-500 truncate">
                {customer.lastMessage || '暂无消息'}
              </p>
            </div>
            {customer.unreadCount > 0 && (
              <Badge content={customer.unreadCount} color="primary" size="sm" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

CustomerList.displayName = 'CustomerList';
`;

  const customerListPath = path.join(__dirname, 'kefu-app/src/components/CustomerList.jsx');
  fs.writeFileSync(customerListPath, customerListComponent);
  
  // 创建ChatArea组件
  const chatAreaComponent = `import React from 'react';
import { ScrollShadow } from '@heroui/react';
import MessagingChatMessage from '../messaging-chat-message';
import EnhancedPromptInput from '../enhanced-prompt-input';

export const ChatArea = React.memo(({ 
  messages, 
  currentCustomer, 
  onSendMessage, 
  onTyping,
  settings 
}) => {
  const messagesEndRef = React.useRef(null);

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  if (!currentCustomer) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-default-500">选择一个客户开始聊天</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* 聊天头部 */}
      <div className="p-4 border-b border-divider bg-content1">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar
              size="sm"
              src={currentCustomer.avatar}
              name={currentCustomer.name}
            />
            <div className={\`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background \${
              currentCustomer.status === 'online' ? 'bg-success' : 'bg-default-300'
            }\`} />
          </div>
          <div className="flex-1">
            <p className="text-small font-medium">{currentCustomer.name}</p>
            <p className="text-tiny text-default-400">
              {currentCustomer.status === 'online' ? '在线' : '离线'}
            </p>
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <ScrollShadow className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessagingChatMessage
              key={message.id}
              avatar={message.senderAvatar}
              name={message.senderName}
              time={message.timestamp}
              message={message.content}
              messageType={message.type}
              isRTL={message.senderId !== currentCustomer.id}
              imageUrl={message.imageUrl}
              fileName={message.fileName}
              fileSize={message.fileSize}
              fileUrl={message.fileUrl}
              voiceDuration={message.voiceDuration}
              voiceUrl={message.voiceUrl}
              status={message.status}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollShadow>

      {/* 输入区域 */}
      <div className="p-4 border-t border-divider bg-content1">
        <EnhancedPromptInput
          onSendMessage={onSendMessage}
          onTyping={onTyping}
          placeholder="输入消息..."
          classNames={{
            button: "bg-primary opacity-100 w-[30px] h-[30px] !min-w-[30px] self-center",
            buttonIcon: "text-primary-foreground",
            input: "placeholder:text-default-500",
          }}
        />
      </div>
    </div>
  );
});

ChatArea.displayName = 'ChatArea';
`;

  const chatAreaPath = path.join(__dirname, 'kefu-app/src/components/ChatArea.jsx');
  fs.writeFileSync(chatAreaPath, chatAreaComponent);
  
  console.log('✅ 优化组件已创建');
}

// 创建错误边界组件
function createErrorBoundary() {
  console.log('🔧 创建错误边界组件...');
  
  const errorBoundaryComponent = `import React from 'react';
import { Button, Card, CardBody } from '@heroui/react';
import { Icon } from '@iconify/react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // 可以在这里发送错误到监控服务
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardBody className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold mb-2">出现了一些问题</h2>
              <p className="text-default-500 mb-4">
                应用程序遇到了一个错误，请尝试重新加载页面。
              </p>
              <Button
                color="primary"
                startContent={<Icon icon="solar:refresh-linear" />}
                onClick={this.handleReload}
              >
                重新加载
              </Button>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-small text-default-500">
                    查看错误详情
                  </summary>
                  <pre className="mt-2 text-xs bg-default-100 p-2 rounded overflow-auto">
                    {this.state.error && this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardBody>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
`;

  const errorBoundaryPath = path.join(__dirname, 'kefu-app/src/components/ErrorBoundary.jsx');
  fs.writeFileSync(errorBoundaryPath, errorBoundaryComponent);
  
  console.log('✅ 错误边界组件已创建');
}

// 创建自定义Hook
function createCustomHooks() {
  console.log('🔧 创建自定义Hook...');
  
  const useWebSocketHook = `import { useState, useEffect, useCallback, useRef } from 'react';
import { getWebSocketClient } from '../websocket-client';

export const useWebSocket = (url, options = {}) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [messages, setMessages] = useState([]);
  const [customers, setCustomers] = useState([]);
  const wsClientRef = useRef(null);

  const connect = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }

    const client = getWebSocketClient(url, {
      ...options,
      onConnect: () => {
        setConnectionStatus('connected');
        options.onConnect?.();
      },
      onDisconnect: () => {
        setConnectionStatus('disconnected');
        options.onDisconnect?.();
      },
      onMessage: (data) => {
        handleMessage(data);
        options.onMessage?.(data);
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        options.onError?.(error);
      }
    });

    wsClientRef.current = client;
    client.connect();
  }, [url, options]);

  const disconnect = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      wsClientRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((messageData) => {
    if (wsClientRef.current && connectionStatus === 'connected') {
      return wsClientRef.current.sendMessage(messageData);
    }
    throw new Error('WebSocket not connected');
  }, [connectionStatus]);

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'Chat':
        setMessages(prev => [...prev, data]);
        break;
      case 'UserList':
        setCustomers(data.users || []);
        break;
      case 'UserStatus':
        setCustomers(prev => 
          prev.map(customer => 
            customer.id === data.userId 
              ? { ...customer, status: data.status }
              : customer
          )
        );
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connectionStatus,
    messages,
    customers,
    sendMessage,
    connect,
    disconnect
  };
};
`;

  const useWebSocketPath = path.join(__dirname, 'kefu-app/src/hooks/useWebSocket.js');
  fs.writeFileSync(useWebSocketPath, useWebSocketHook);
  
  console.log('✅ 自定义Hook已创建');
}

// 更新package.json添加测试依赖
function updatePackageJson() {
  console.log('🔧 更新package.json...');
  
  const packageJsonPath = path.join(__dirname, 'kefu-app/package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // 添加测试脚本和依赖
  packageJson.scripts = {
    ...packageJson.scripts,
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  };
  
  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log('✅ Package.json已更新');
}

// 创建Jest配置
function createJestConfig() {
  console.log('🔧 创建Jest配置...');
  
  const jestConfig = `module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/index.jsx',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
`;

  const jestConfigPath = path.join(__dirname, 'kefu-app/jest.config.js');
  fs.writeFileSync(jestConfigPath, jestConfig);
  
  // 创建setupTests.js
  const setupTests = `import '@testing-library/jest-dom';

// Mock WebSocket
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.();
    }, 0);
  }
  
  send(data) {
    this.onmessage?.({ data });
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.();
  }
};

WebSocket.CONNECTING = 0;
WebSocket.OPEN = 1;
WebSocket.CLOSING = 2;
WebSocket.CLOSED = 3;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;
`;

  const setupTestsPath = path.join(__dirname, 'kefu-app/src/setupTests.js');
  fs.writeFileSync(setupTestsPath, setupTests);
  
  console.log('✅ Jest配置已创建');
}

// 创建示例测试
function createExampleTests() {
  console.log('🔧 创建示例测试...');
  
  const customerListTest = `import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerList } from '../components/CustomerList';

const mockCustomers = [
  {
    id: '1',
    name: '张三',
    status: 'online',
    avatar: 'avatar1.jpg',
    timestamp: new Date(),
    lastMessage: '你好',
    unreadCount: 2
  },
  {
    id: '2',
    name: '李四',
    status: 'offline',
    avatar: 'avatar2.jpg',
    timestamp: new Date(),
    lastMessage: '再见',
    unreadCount: 0
  }
];

describe('CustomerList', () => {
  it('renders customer list correctly', () => {
    const mockOnSelect = jest.fn();
    render(<CustomerList customers={mockCustomers} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
  });

  it('calls onSelect when customer is clicked', () => {
    const mockOnSelect = jest.fn();
    render(<CustomerList customers={mockCustomers} onSelect={mockOnSelect} />);
    
    fireEvent.click(screen.getByText('张三'));
    expect(mockOnSelect).toHaveBeenCalledWith(mockCustomers[0]);
  });

  it('shows unread count badge', () => {
    const mockOnSelect = jest.fn();
    render(<CustomerList customers={mockCustomers} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
`;

  const customerListTestPath = path.join(__dirname, 'kefu-app/src/components/__tests__/CustomerList.test.jsx');
  fs.mkdirSync(path.dirname(customerListTestPath), { recursive: true });
  fs.writeFileSync(customerListTestPath, customerListTest);
  
  console.log('✅ 示例测试已创建');
}

// 主函数
function main() {
  console.log('🚀 开始修复React项目问题...\n');
  
  try {
    fixStateMutations();
    fixKeyProps();
    createOptimizedComponents();
    createErrorBoundary();
    createCustomHooks();
    updatePackageJson();
    createJestConfig();
    createExampleTests();
    
    console.log('\n✅ 所有修复完成！');
    console.log('\n📋 下一步操作：');
    console.log('1. 运行 npm install 安装新的依赖');
    console.log('2. 运行 npm test 执行测试');
    console.log('3. 检查修复后的代码');
    console.log('4. 根据报告中的建议继续优化');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  fixStateMutations,
  fixKeyProps,
  createOptimizedComponents,
  createErrorBoundary,
  createCustomHooks,
  updatePackageJson,
  createJestConfig,
  createExampleTests,
  main
};