import React, { useState, useRef, useCallback } from 'react';
import { Button, Textarea, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@/hooks/useChat';
import { uploadFile } from '@/services/api';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

interface MessageInputProps {
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MessageInput({ 
  disabled = false, 
  placeholder = "输入消息...",
  className 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    sendMessage, 
    isSending, 
    connectionStatus, 
    startTyping, 
    stopTyping,
    currentSession 
  } = useChat();

  const canSend = message.trim().length > 0 && !isSending && !disabled && currentSession;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;

    const content = message.trim();
    setMessage('');
    stopTyping();
    sendMessage(content);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, canSend, sendMessage, stopTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      setMessage('');
      textareaRef.current?.blur();
    }
  }, [handleSubmit]);

  const handleChange = useCallback((value: string) => {
    setMessage(value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
    
    // Handle typing indicators
    if (value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  }, [startTyping, stopTyping]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!currentSession) {
      toast.error('请先选择一个会话');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('文件大小不能超过10MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });

      // Send file message
      await sendMessage(result.url, 'file');
      
      toast.success('文件上传成功');
    } catch (error) {
      console.error('File upload failed:', error);
      toast.error('文件上传失败');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [currentSession, sendMessage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        await handleFileUpload(file);
      }
    }
  }, [handleFileUpload]);

  return (
    <div className={clsx('border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800', className)}>
      {/* Upload progress */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center gap-2">
              <Icon icon="mdi:upload" className="text-blue-500" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                上传中... {uploadProgress}%
              </span>
              <div className="flex-1 bg-blue-200 dark:bg-blue-800 rounded-full h-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection status */}
      {!connectionStatus.connected && (
        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2">
            <Icon 
              icon={connectionStatus.reconnecting ? "mdi:loading" : "mdi:wifi-off"} 
              className={clsx(
                "text-yellow-600 dark:text-yellow-400",
                connectionStatus.reconnecting && "animate-spin"
              )}
            />
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              {connectionStatus.reconnecting ? '正在重连...' : '连接已断开'}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex items-end gap-2">
          {/* Attachment button */}
          <Dropdown>
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                isDisabled={disabled || isUploading}
              >
                <Icon icon="mdi:attachment" className="text-lg" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem
                key="file"
                startContent={<Icon icon="mdi:file" />}
                onPress={() => fileInputRef.current?.click()}
              >
                上传文件
              </DropdownItem>
              <DropdownItem
                key="image"
                startContent={<Icon icon="mdi:image" />}
                onPress={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/*';
                    fileInputRef.current.click();
                  }
                }}
              >
                上传图片
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>

          {/* Message input */}
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onValueChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              minRows={1}
              maxRows={5}
              classNames={{
                base: "bg-gray-50 dark:bg-gray-700",
                input: "text-sm resize-none",
              }}
              isDisabled={disabled}
            />
          </div>

          {/* Send button */}
          <Button
            type="submit"
            color="primary"
            isIconOnly
            size="lg"
            isDisabled={!canSend}
            isLoading={isSending}
            className="shrink-0"
          >
            <Icon icon="mdi:send" className="text-lg" />
          </Button>
        </div>

        {/* Helper text */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>按 Enter 发送，Shift + Enter 换行</span>
          <span>{message.length}/2000</span>
        </div>
      </form>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileSelect}
        accept="*/*"
      />
    </div>
  );
}