import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { VariableSizeList as List } from 'react-window';
import { Input, Button, Upload, Popover, Spin, Empty, message as antMessage } from 'antd';
import {
  SendOutlined,
  PaperClipOutlined,
  PictureOutlined,
  AudioOutlined,
  SmileOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useMessageStore } from '../../stores/messageStore';
import MessageItem from './MessageItem';
import EmojiPicker from '../common/EmojiPicker';
import VoiceRecorder from '../common/VoiceRecorder';
import { debounce } from 'lodash-es';

const { TextArea } = Input;

// 聊天窗口组件
const ChatWindow = ({
  sessionId,
  customerId,
  customerInfo,
  onSessionEnd,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const itemHeights = useRef({});
  
  // WebSocket 连接
  const { sendMessage, connectionState, typing } = useWebSocket();
  
  // 消息存储
  const { 
    messages, 
    loading, 
    hasMore,
    loadMessages, 
    loadMoreMessages,
    addMessage,
    updateMessageStatus 
  } = useMessageStore(sessionId);

  // 加载消息
  useEffect(() => {
    if (sessionId) {
      loadMessages(sessionId);
    }
  }, [sessionId, loadMessages]);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length]);

  // 监听新消息自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !sessionId) return;

    const messageData = {
      type: 'text',
      content: inputValue.trim(),
      sessionId,
      customerId,
      timestamp: Date.now()
    };

    // 清空输入框
    setInputValue('');
    
    // 添加到本地消息列表（乐观更新）
    const tempId = `temp_${Date.now()}`;
    addMessage({
      id: tempId,
      ...messageData,
      status: 'sending',
      isOwn: true
    });

    try {
      // 发送消息
      const result = await sendMessage(messageData);
      
      // 更新消息状态
      updateMessageStatus(tempId, {
        id: result.messageId,
        status: 'sent'
      });
    } catch (error) {
      // 发送失败
      updateMessageStatus(tempId, {
        status: 'failed'
      });
      antMessage.error('消息发送失败');
    }
  }, [inputValue, sessionId, customerId, sendMessage, addMessage, updateMessageStatus]);

  // 处理输入
  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
    
    // 发送正在输入状态
    if (!isTyping) {
      setIsTyping(true);
      typing.start(sessionId);
    }
  }, [isTyping, sessionId, typing]);

  // 停止输入（防抖）
  const stopTyping = useMemo(
    () => debounce(() => {
      setIsTyping(false);
      typing.stop(sessionId);
    }, 1000),
    [sessionId, typing]
  );

  useEffect(() => {
    if (isTyping) {
      stopTyping();
    }
  }, [inputValue, isTyping, stopTyping]);

  // 处理文件上传
  const handleUpload = useCallback(async (file) => {
    setUploading(true);
    
    try {
      // 创建 FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append('customerId', customerId);

      // 上传文件
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('上传失败');

      const result = await response.json();
      
      // 发送文件消息
      await sendMessage({
        type: result.fileType,
        url: result.url,
        filename: result.filename,
        filesize: result.filesize,
        sessionId,
        customerId
      });

      antMessage.success('文件上传成功');
    } catch (error) {
      antMessage.error('文件上传失败');
    } finally {
      setUploading(false);
    }
    
    return false; // 阻止默认上传
  }, [sessionId, customerId, sendMessage]);

  // 处理语音消息
  const handleVoiceMessage = useCallback(async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');
      formData.append('sessionId', sessionId);
      formData.append('customerId', customerId);

      const response = await fetch('/api/voice', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('语音上传失败');

      const result = await response.json();
      
      // 发送语音消息
      await sendMessage({
        type: 'voice',
        url: result.url,
        duration: result.duration,
        sessionId,
        customerId
      });

      setShowVoice(false);
      antMessage.success('语音消息发送成功');
    } catch (error) {
      antMessage.error('语音消息发送失败');
    }
  }, [sessionId, customerId, sendMessage]);

  // 计算列表项高度
  const getItemSize = useCallback((index) => {
    return itemHeights.current[index] || 80;
  }, []);

  // 渲染消息项
  const MessageRow = useCallback(({ index, style }) => {
    const message = messages[index];
    
    return (
      <div style={style}>
        <div
          ref={(el) => {
            if (el && itemHeights.current[index] !== el.offsetHeight) {
              itemHeights.current[index] = el.offsetHeight;
              listRef.current?.resetAfterIndex(index);
            }
          }}
        >
          <MessageItem
            message={message}
            isOwn={message.isOwn}
            onRetry={handleSend}
          />
        </div>
      </div>
    );
  }, [messages, handleSend]);

  // 加载更多消息
  const handleScroll = useCallback(({ scrollOffset }) => {
    if (scrollOffset < 100 && hasMore && !loading) {
      loadMoreMessages();
    }
  }, [hasMore, loading, loadMoreMessages]);

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* 客户信息栏 */}
      {customerInfo && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
          <div className="flex items-center">
            <img
              src={customerInfo.avatar || '/default-avatar.png'}
              alt={customerInfo.name}
              className="w-10 h-10 rounded-full mr-3"
            />
            <div>
              <h3 className="text-sm font-medium">{customerInfo.name}</h3>
              <p className="text-xs text-gray-500">
                {connectionState === 'connected' ? '在线' : '离线'}
              </p>
            </div>
          </div>
          <Button
            type="primary"
            danger
            size="small"
            onClick={onSessionEnd}
          >
            结束会话
          </Button>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-hidden">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Spin indicator={<LoadingOutlined spin />} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Empty description="暂无消息" />
          </div>
        ) : (
          <List
            ref={listRef}
            height={600}
            itemCount={messages.length}
            itemSize={getItemSize}
            width="100%"
            onScroll={handleScroll}
            className="px-4 py-2"
          >
            {MessageRow}
          </List>
        )}
      </div>

      {/* 输入区域 */}
      <div className="border-t bg-white p-4">
        <div className="flex items-end space-x-2">
          {/* 表情选择 */}
          <Popover
            content={
              <EmojiPicker
                onSelect={(emoji) => {
                  setInputValue(prev => prev + emoji);
                  setShowEmoji(false);
                  inputRef.current?.focus();
                }}
              />
            }
            trigger="click"
            open={showEmoji}
            onOpenChange={setShowEmoji}
          >
            <Button
              type="text"
              icon={<SmileOutlined />}
              className="text-gray-500 hover:text-gray-700"
            />
          </Popover>

          {/* 文件上传 */}
          <Upload
            beforeUpload={handleUpload}
            showUploadList={false}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            disabled={uploading}
          >
            <Button
              type="text"
              icon={<PaperClipOutlined />}
              loading={uploading}
              className="text-gray-500 hover:text-gray-700"
            />
          </Upload>

          {/* 图片上传 */}
          <Upload
            beforeUpload={handleUpload}
            showUploadList={false}
            accept="image/*"
            disabled={uploading}
          >
            <Button
              type="text"
              icon={<PictureOutlined />}
              loading={uploading}
              className="text-gray-500 hover:text-gray-700"
            />
          </Upload>

          {/* 语音消息 */}
          <Popover
            content={
              <VoiceRecorder
                onRecordComplete={handleVoiceMessage}
                onCancel={() => setShowVoice(false)}
              />
            }
            trigger="click"
            open={showVoice}
            onOpenChange={setShowVoice}
            placement="topLeft"
          >
            <Button
              type="text"
              icon={<AudioOutlined />}
              className="text-gray-500 hover:text-gray-700"
            />
          </Popover>

          {/* 输入框 */}
          <TextArea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="flex-1"
          />

          {/* 发送按钮 */}
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={!inputValue.trim()}
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;