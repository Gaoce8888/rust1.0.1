import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FloatButton, 
  Badge, 
  Drawer, 
  Card, 
  message as antMessage,
  ConfigProvider,
  theme
} from 'antd';
import {
  MessageOutlined,
  CloseOutlined,
  MinusOutlined,
  ExpandOutlined,
  CompressOutlined,
  CustomerServiceOutlined
} from '@ant-design/icons';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useMessageStore } from '../../stores/messageStore';
import { useSessionStore } from '../../stores/sessionStore';
import ChatWindow from './ChatWindow';
import WelcomeScreen from './WelcomeScreen';
import QueueStatus from './QueueStatus';
import './ChatWidget.css';

// 聊天小部件模式
const WidgetMode = {
  FLOAT: 'float',      // 浮动按钮
  EMBED: 'embed',      // 嵌入页面
  POPUP: 'popup'       // 弹出窗口
};

// 聊天状态
const ChatState = {
  IDLE: 'idle',              // 空闲
  CONNECTING: 'connecting',   // 连接中
  WELCOME: 'welcome',        // 欢迎界面
  QUEUING: 'queuing',        // 排队中
  CHATTING: 'chatting',      // 聊天中
  ENDED: 'ended'             // 已结束
};

// 聊天小部件组件
const ChatWidget = ({
  mode = WidgetMode.FLOAT,
  position = { bottom: 24, right: 24 },
  theme: customTheme,
  config = {},
  onReady,
  className = ''
}) => {
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [chatState, setChatState] = useState(ChatState.IDLE);
  const [queuePosition, setQueuePosition] = useState(0);
  
  const containerRef = useRef(null);
  const { isConnected, subscribe } = useWebSocket();
  const { getTotalUnreadCount } = useMessageStore();
  const { 
    currentSession, 
    createSession, 
    endSession,
    updateSessionStatus 
  } = useSessionStore();

  // 主题配置
  const widgetTheme = customTheme || {
    token: {
      colorPrimary: '#1890ff',
      borderRadius: 8,
    },
    algorithm: theme.defaultAlgorithm,
  };

  // 初始化
  useEffect(() => {
    if (onReady) {
      onReady({
        open: () => setVisible(true),
        close: () => setVisible(false),
        minimize: () => setMinimized(true),
        restore: () => setMinimized(false),
        endChat: handleEndChat
      });
    }
  }, [onReady]);

  // 监听连接状态
  useEffect(() => {
    if (isConnected && visible && chatState === ChatState.CONNECTING) {
      setChatState(ChatState.WELCOME);
    }
  }, [isConnected, visible, chatState]);

  // 订阅服务器事件
  useEffect(() => {
    const unsubscribeQueue = subscribe('queueUpdate', (data) => {
      if (data.sessionId === currentSession?.id) {
        setQueuePosition(data.position);
        if (data.position === 0) {
          setChatState(ChatState.CHATTING);
          updateSessionStatus(data.sessionId, 'active');
        }
      }
    });

    const unsubscribeAssign = subscribe('agentAssigned', (data) => {
      if (data.sessionId === currentSession?.id) {
        setChatState(ChatState.CHATTING);
        antMessage.success(`已为您分配客服: ${data.agentName}`);
      }
    });

    const unsubscribeEnd = subscribe('sessionEnded', (data) => {
      if (data.sessionId === currentSession?.id) {
        setChatState(ChatState.ENDED);
        antMessage.info('会话已结束');
      }
    });

    return () => {
      unsubscribeQueue();
      unsubscribeAssign();
      unsubscribeEnd();
    };
  }, [subscribe, currentSession, updateSessionStatus]);

  // 打开聊天
  const handleOpen = useCallback(() => {
    setVisible(true);
    setMinimized(false);
    
    if (!currentSession && chatState === ChatState.IDLE) {
      setChatState(ChatState.CONNECTING);
    }
  }, [currentSession, chatState]);

  // 关闭聊天
  const handleClose = useCallback(() => {
    if (chatState === ChatState.CHATTING) {
      antMessage.warning('请先结束会话再关闭窗口');
      return;
    }
    setVisible(false);
  }, [chatState]);

  // 开始聊天
  const handleStartChat = useCallback(async (userInfo) => {
    try {
      setChatState(ChatState.QUEUING);
      
      const session = await createSession({
        customerInfo: userInfo,
        source: 'web',
        metadata: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          ...config.metadata
        }
      });

      if (session.status === 'active') {
        setChatState(ChatState.CHATTING);
      } else {
        setQueuePosition(session.queuePosition || 1);
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
      antMessage.error('连接失败，请稍后重试');
      setChatState(ChatState.WELCOME);
    }
  }, [createSession, config.metadata]);

  // 结束聊天
  const handleEndChat = useCallback(async () => {
    if (!currentSession) return;

    try {
      await endSession(currentSession.id);
      setChatState(ChatState.ENDED);
      
      setTimeout(() => {
        setChatState(ChatState.WELCOME);
      }, 3000);
    } catch (error) {
      console.error('Failed to end chat:', error);
      antMessage.error('结束会话失败');
    }
  }, [currentSession, endSession]);

  // 渲染聊天内容
  const renderChatContent = () => {
    switch (chatState) {
      case ChatState.CONNECTING:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
              <p className="text-gray-600">连接中...</p>
            </div>
          </div>
        );

      case ChatState.WELCOME:
        return (
          <WelcomeScreen
            onStartChat={handleStartChat}
            config={config}
          />
        );

      case ChatState.QUEUING:
        return (
          <QueueStatus
            position={queuePosition}
            estimatedWaitTime={queuePosition * 30} // 估计等待时间
            onCancel={() => {
              endSession(currentSession?.id);
              setChatState(ChatState.WELCOME);
            }}
          />
        );

      case ChatState.CHATTING:
        return (
          <ChatWindow
            sessionId={currentSession?.id}
            onSessionEnd={handleEndChat}
            className="h-full"
          />
        );

      case ChatState.ENDED:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CheckCircleOutlined className="text-5xl text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">会话已结束</h3>
              <p className="text-gray-600 mb-4">感谢您的咨询</p>
              <Button
                type="primary"
                onClick={() => setChatState(ChatState.WELCOME)}
              >
                开始新会话
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // 浮动模式
  if (mode === WidgetMode.FLOAT) {
    const unreadCount = getTotalUnreadCount();

    return (
      <ConfigProvider theme={widgetTheme}>
        {/* 浮动按钮 */}
        <FloatButton
          icon={<MessageOutlined />}
          type="primary"
          style={position}
          badge={{ count: unreadCount }}
          onClick={handleOpen}
          className={`chat-float-button ${className}`}
        />

        {/* 聊天抽屉 */}
        <Drawer
          title={
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CustomerServiceOutlined className="mr-2" />
                <span>在线客服</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  type="text"
                  size="small"
                  icon={minimized ? <ExpandOutlined /> : <MinusOutlined />}
                  onClick={() => setMinimized(!minimized)}
                />
                <Button
                  type="text"
                  size="small"
                  icon={fullscreen ? <CompressOutlined /> : <ExpandOutlined />}
                  onClick={() => setFullscreen(!fullscreen)}
                />
              </div>
            </div>
          }
          placement="right"
          width={fullscreen ? '100%' : 400}
          height={fullscreen ? '100%' : undefined}
          closable={true}
          onClose={handleClose}
          open={visible}
          bodyStyle={{ padding: 0, height: minimized ? 0 : '100%' }}
          className="chat-drawer"
        >
          <div className="h-full" style={{ display: minimized ? 'none' : 'block' }}>
            {renderChatContent()}
          </div>
        </Drawer>
      </ConfigProvider>
    );
  }

  // 嵌入模式
  if (mode === WidgetMode.EMBED) {
    return (
      <ConfigProvider theme={widgetTheme}>
        <Card
          ref={containerRef}
          className={`chat-embed-container ${className}`}
          bodyStyle={{ padding: 0, height: '100%' }}
        >
          {renderChatContent()}
        </Card>
      </ConfigProvider>
    );
  }

  // 弹出窗口模式
  if (mode === WidgetMode.POPUP) {
    // 弹出窗口逻辑需要在父组件中处理
    return null;
  }

  return null;
};

export default ChatWidget;