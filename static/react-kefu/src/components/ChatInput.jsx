import React, { useState, useRef, useCallback } from 'react';
import { Button, Loading } from './UI';
import clsx from 'clsx';

const ChatInput = ({
  value = '',
  onChange,
  onSend,
  onFileUpload,
  onEmojiSelect,
  placeholder = '输入消息...',
  disabled = false,
  loading = false,
  showEmoji = true,
  showFile = true,
  showImage = true,
  maxLength = 1000,
  autoFocus = false,
  className,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // 处理键盘事件
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [value, onSend]);

  // 发送消息
  const handleSend = useCallback(() => {
    if (!value.trim() || disabled || loading) return;
    
    onSend?.(value.trim());
    onChange?.('');
    setIsExpanded(false);
    
    // 重新聚焦输入框
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, [value, disabled, loading, onSend, onChange]);

  // 处理文件上传
  const handleFileSelect = useCallback(async (e, type = 'file') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFileUploading(true);
    
    try {
      for (const file of files) {
        await onFileUpload?.(file, type);
      }
    } catch (error) {
      console.error('文件上传失败:', error);
    } finally {
      setFileUploading(false);
      // 清空文件输入
      e.target.value = '';
    }
  }, [onFileUpload]);

  // 处理输入变化
  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange?.(newValue);
    }
    
    // 自动调整高度
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      setIsExpanded(textarea.scrollHeight > 40);
    }
  }, [onChange, maxLength]);

  // 表情选择器（简单实现）
  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'];

  return (
    <div className={clsx('bg-white border-t border-gray-200', className)} {...props}>
      {/* 表情选择器 */}
      {showEmoji && isExpanded && (
        <div className="p-3 border-b border-gray-100">
          <div className="flex flex-wrap gap-1">
            {emojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => {
                  onChange?.(value + emoji);
                  textareaRef.current?.focus();
                }}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                disabled={disabled}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        {/* 文件上传按钮 */}
        <div className="flex space-x-1">
          {showFile && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || fileUploading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="上传文件"
            >
              {fileUploading ? (
                <Loading size="small" />
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}

          {showImage && (
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={disabled || fileUploading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="上传图片"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {showEmoji && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={disabled}
              className={clsx(
                'p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50',
                isExpanded && 'bg-gray-100 text-gray-600'
              )}
              title="表情"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* 输入框 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            className={clsx(
              'w-full px-3 py-2 border border-gray-300 rounded-lg resize-none',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-gray-50 disabled:text-gray-500',
              'placeholder-gray-400',
              isExpanded ? 'min-h-[40px] max-h-[120px]' : 'h-10'
            )}
            style={{ height: '40px' }}
          />
          
          {/* 字数统计 */}
          {maxLength && value.length > maxLength * 0.8 && (
            <div className={clsx(
              'absolute bottom-1 right-2 text-xs',
              value.length >= maxLength ? 'text-red-500' : 'text-gray-400'
            )}>
              {value.length}/{maxLength}
            </div>
          )}
        </div>

        {/* 发送按钮 */}
        <Button
          onClick={handleSend}
          disabled={!value.trim() || disabled || value.length > maxLength}
          isLoading={loading}
          size="medium"
          variant="primary"
          className="flex-shrink-0"
        >
          发送
        </Button>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'file')}
        multiple
        accept=".pdf,.doc,.docx,.txt,.zip,.rar"
      />

      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'image')}
        multiple
        accept="image/*"
      />
    </div>
  );
};

export default ChatInput;