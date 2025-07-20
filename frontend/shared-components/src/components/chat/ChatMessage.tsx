import React, { useState } from 'react';
import { cn, formatRelativeTime, isImageFile, isVideoFile, isAudioFile } from '../../utils';
import { ChatMessageProps, MessageData } from '../../types';
import { 
  MoreVertical, 
  Download, 
  Copy, 
  Trash2, 
  RefreshCw,
  Check,
  X,
  Play,
  Pause
} from 'lucide-react';
import Button from '../ui/Button';

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isOwn,
  showAvatar = true,
  showTimestamp = true,
  onRetry,
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleRetry = () => {
    setShowMenu(false);
    onRetry?.(message.message_id);
  };

  const handleDelete = () => {
    setShowMenu(false);
    onDelete?.(message.message_id);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
    setShowMenu(false);
  };

  const handleDownload = () => {
    // 实现文件下载逻辑
    const link = document.createElement('a');
    link.href = message.content;
    link.download = message.metadata?.filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowMenu(false);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        );

      case 'image':
        return (
          <div className="max-w-xs">
            <img 
              src={message.content} 
              alt="图片消息"
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.content, '_blank')}
            />
          </div>
        );

      case 'file':
        const filename = message.metadata?.filename || '未知文件';
        const filesize = message.metadata?.filesize ? 
          `(${formatFileSize(parseInt(message.metadata.filesize))})` : '';
        
        return (
          <div className="flex items-center p-3 bg-gray-50 rounded-lg border">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{filename}</div>
              <div className="text-xs text-gray-500">{filesize}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="ml-2"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );

      case 'voice':
        return (
          <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlay}
              className="p-1"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '30%' }} />
            </div>
            <span className="text-xs text-gray-500">
              {message.metadata?.duration || '0:00'}
            </span>
          </div>
        );

      case 'video':
        return (
          <div className="max-w-xs">
            <video 
              src={message.content}
              controls
              className="rounded-lg max-w-full h-auto"
              preload="metadata"
            />
          </div>
        );

      case 'system':
        return (
          <div className="text-center text-sm text-gray-500 italic">
            {message.content}
          </div>
        );

      case 'notification':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-sm text-yellow-800">
              {message.content}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-gray-600">
            {message.content}
          </div>
        );
    }
  };

  const renderStatus = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case 'sending':
        return <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />;
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <Check className="h-3 w-3 text-blue-500" />;
      case 'read':
        return <Check className="h-3 w-3 text-blue-600" />;
      case 'failed':
        return <X className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={cn(
      'flex items-start space-x-2 mb-4',
      isOwn ? 'flex-row-reverse space-x-reverse' : ''
    )}>
      {/* 头像 */}
      {showAvatar && (
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium',
          isOwn ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'
        )}>
          {message.sender_id.charAt(0).toUpperCase()}
        </div>
      )}

      {/* 消息内容 */}
      <div className={cn(
        'flex-1 max-w-xs lg:max-w-md',
        isOwn ? 'text-right' : 'text-left'
      )}>
        {/* 发送者名称 */}
        {!isOwn && (
          <div className="text-xs text-gray-500 mb-1">
            {message.metadata?.sender_name || message.sender_id}
          </div>
        )}

        {/* 消息气泡 */}
        <div className={cn(
          'relative inline-block p-3 rounded-lg',
          isOwn 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-900'
        )}>
          {renderMessageContent()}
          
          {/* 消息状态 */}
          <div className="flex items-center justify-end mt-1 space-x-1">
            {showTimestamp && (
              <span className={cn(
                'text-xs',
                isOwn ? 'text-blue-100' : 'text-gray-500'
              )}>
                {formatRelativeTime(message.timestamp)}
              </span>
            )}
            {renderStatus()}
          </div>

          {/* 操作菜单 */}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
              className={cn(
                'p-1 h-6 w-6',
                isOwn ? 'text-blue-100 hover:text-white' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>

            {showMenu && (
              <div className={cn(
                'absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-32',
                isOwn ? 'right-0' : 'left-0'
              )}>
                <button
                  onClick={handleCopy}
                  className="w-full px-3 py-1 text-left text-sm hover:bg-gray-50 flex items-center"
                >
                  <Copy className="h-3 w-3 mr-2" />
                  {isCopied ? '已复制' : '复制'}
                </button>
                
                {message.message_type === 'file' && (
                  <button
                    onClick={handleDownload}
                    className="w-full px-3 py-1 text-left text-sm hover:bg-gray-50 flex items-center"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    下载
                  </button>
                )}
                
                {message.status === 'failed' && onRetry && (
                  <button
                    onClick={handleRetry}
                    className="w-full px-3 py-1 text-left text-sm hover:bg-gray-50 flex items-center"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    重试
                  </button>
                )}
                
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-1 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center"
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    删除
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;