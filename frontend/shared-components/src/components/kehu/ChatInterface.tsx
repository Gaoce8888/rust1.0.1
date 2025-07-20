import React, { useState, useRef, useEffect } from 'react';
import { cn, formatRelativeTime } from '../../utils';
import { MessageData, MessageType, User } from '../../types';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  Image, 
  File, 
  Video,
  Phone,
  MoreVertical,
  Minimize2,
  Maximize2,
  X
} from 'lucide-react';
import Button from '../ui/Button';
import ChatMessage from '../chat/ChatMessage';
import { useMessages, useSession } from '../../hooks';

interface ChatInterfaceProps {
  agentId?: string;
  agentInfo?: User;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  isMinimized?: boolean;
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  agentId = 'default-agent',
  agentInfo,
  onMinimize,
  onMaximize,
  onClose,
  isMinimized = false,
  className
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { user } = useSession();
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    addMessage 
  } = useMessages(agentId);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const content = inputValue.trim();
    setInputValue('');
    setIsTyping(false);

    try {
      await sendMessage(content, 'text');
    } catch (error) {
      console.error('Failed to send message:', error);
      // 可以显示错误提示
    }
  };

  // 处理按键事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 处理输入变化
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setIsTyping(value.length > 0);
  };

  // 发送文件
  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // 这里应该调用文件上传API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        await sendMessage(result.url, 'file');
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  // 发送图片
  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        await sendMessage(result.url, 'image');
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  };

  // 开始录音
  const startRecording = () => {
    setIsRecording(true);
    // 实现录音逻辑
  };

  // 停止录音
  const stopRecording = () => {
    setIsRecording(false);
    // 实现录音停止和发送逻辑
  };

  // 快速回复
  const quickReplies = [
    '您好，我需要帮助',
    '谢谢您的帮助',
    '我明白了',
    '请稍等一下'
  ];

  const handleQuickReply = (reply: string) => {
    setInputValue(reply);
  };

  if (isMinimized) {
    return (
      <div className={cn(
        'fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200',
        className
      )}>
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {agentInfo?.name?.charAt(0) || 'A'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">{agentInfo?.name || '客服'}</p>
              <p className="text-xs text-gray-500">点击展开聊天</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMaximize}
              className="p-1 h-6 w-6"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-lg',
      className
    )}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-white font-medium">
              {agentInfo?.name?.charAt(0) || 'A'}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {agentInfo?.name || '在线客服'}
            </h3>
            <p className="text-sm text-gray-500">
              {agentInfo?.status === 'online' ? '在线' : '离线'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMinimize}
            className="p-1 h-6 w-6"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-6 w-6"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-lg font-medium mb-2">开始对话</p>
            <p className="text-sm text-center">
              您好！我是您的专属客服，有什么可以帮助您的吗？
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.message_id}
              message={message}
              isOwn={message.sender_id === user?.id}
              showAvatar={true}
              showTimestamp={true}
            />
          ))
        )}
        
        {/* 快速回复 */}
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickReply(reply)}
                className="text-xs"
              >
                {reply}
              </Button>
            ))}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-200">
        {/* 工具栏 */}
        <div className="flex items-center space-x-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => imageInputRef.current?.click()}
            className="p-2 h-8 w-8"
          >
            <Image className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 h-8 w-8"
          >
            <File className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 h-8 w-8"
          >
            <Smile className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "p-2 h-8 w-8",
              isRecording && "text-red-500"
            )}
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>

        {/* 输入框 */}
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="px-4 py-2"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* 表情选择器 */}
        {showEmojiPicker && (
          <div className="mt-2 p-2 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-8 gap-1">
              {['😊', '😂', '😍', '🤔', '👍', '👎', '❤️', '😭'].map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInputValue(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="p-1 hover:bg-gray-200 rounded text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileUpload(file);
          }
        }}
      />
      
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleImageUpload(file);
          }
        }}
      />
    </div>
  );
};

export default ChatInterface;