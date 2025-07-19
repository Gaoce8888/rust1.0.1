"use client";

import React, {useCallback} from "react";
import {Avatar, Image, Button, Progress, Chip} from "@heroui/react";
import {cn} from "@heroui/react";
import {Icon} from "@iconify/react";

// 消息类型定义
export const MessageType = {
  TEXT: 'text',           // 文本消息
  IMAGE: 'image',         // 图片消息
  FILE: 'file',           // 文件消息
  VOICE: 'voice',         // 语音消息
  SYSTEM: 'system',       // 系统消息
};

// 聊天消息组件
// 用于显示单条聊天消息，支持多种消息类型
// 参数说明：
// - avatar: 发送者头像URL
// - name: 发送者名称
// - time: 发送时间
// - message: 消息内容
// - messageType: 消息类型（text/image/file/voice/system）
// - isRTL: 是否右对齐（通常发送的消息在右侧）
// - imageUrl: 图片URL（图片消息）
// - fileName: 文件名（文件消息）
// - fileSize: 文件大小（文件消息）
// - fileUrl: 文件下载URL（文件消息）
// - voiceDuration: 语音时长（语音消息）
// - voiceUrl: 语音URL（语音消息）
// - status: 消息状态（sending/sent/delivered/read/failed）
// - className: 自定义类名
// - classNames: 各部分的自定义类名
const MessagingChatMessage = React.forwardRef(
  ({
    avatar, 
    name, 
    time, 
    message, 
    messageType = MessageType.TEXT,
    isRTL, 
    imageUrl, 
    fileName,
    fileSize,
    fileUrl,
    voiceDuration,
    voiceUrl,
    status,
    className, 
    classNames, 
    ...props
  }, ref) => {
    const messageRef = React.useRef(null);

    // 头像组件 - 使用useCallback优化性能
    const MessageAvatar = useCallback(
      () => (
        <div className="relative flex-none">
          <Avatar src={avatar} />
        </div>
      ),

      [avatar],
    );

    // 语音消息播放状态
    const [isPlaying, setIsPlaying] = React.useState(false);

    // 文件大小格式化
    const formatFileSize = (bytes) => {
      if (!bytes) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 格式化语音时长
    const formatDuration = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // 渲染消息内容
    const renderMessageContent = () => {
      switch (messageType) {
        case MessageType.TEXT:
          return (
            <div className="whitespace-pre-line">{message}</div>
          );
          
        case MessageType.IMAGE:
          return (
            <div className="mt-2">
              <Image
                alt={`Image sent by ${name}`}
                className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                src={imageUrl}
                width={264}
                onClick={() => window.open(imageUrl, '_blank')}
              />
            </div>
          );
          
        case MessageType.FILE:
          return (
            <div className="mt-2">
              <Button
                className="w-full justify-start"
                variant="flat"
                startContent={
                  <Icon icon="solar:document-linear" width={20} />
                }
                endContent={
                  <Icon icon="solar:download-linear" width={16} />
                }
                onClick={() => window.open(fileUrl, '_blank')}
              >
                <div className="flex flex-col items-start">
                  <span className="text-small font-medium">{fileName}</span>
                  <span className="text-tiny text-default-400">{formatFileSize(fileSize)}</span>
                </div>
              </Button>
            </div>
          );
          
        case MessageType.VOICE:
          return (
            <div className="mt-2">
              <Button
                className="w-full justify-start"
                variant="flat"
                startContent={
                  <Icon 
                    icon={isPlaying ? "solar:pause-circle-linear" : "solar:play-circle-linear"} 
                    width={24} 
                  />
                }
                onClick={() => {
                  // 这里需要实现音频播放逻辑
                  setIsPlaying(!isPlaying);
                }}
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1">
                    <Progress 
                      size="sm" 
                      value={isPlaying ? 50 : 0} 
                      className="max-w-md"
                      color="primary"
                    />
                  </div>
                  <span className="text-tiny text-default-400">
                    {formatDuration(voiceDuration || 0)}
                  </span>
                </div>
              </Button>
            </div>
          );
          
        case MessageType.SYSTEM:
          return (
            <div className="text-center text-tiny text-default-400 py-2">
              {message}
            </div>
          );
          
        default:
          return <div className="whitespace-pre-line">{message}</div>;
      }
    };

    // 消息内容组件
    const Message = () => {
      // 系统消息特殊处理
      if (messageType === MessageType.SYSTEM) {
        return (
          <div className="flex justify-center w-full">
            <Chip size="sm" variant="flat" className="bg-default-100">
              {message}
            </Chip>
          </div>
        );
      }

      return (
        <div className="flex max-w-[70%] flex-col gap-4">
          <div
            className={cn(
              "relative w-full rounded-medium bg-content2 px-4 py-3 text-default-600",
              classNames?.base,
            )}
          >
            <div className="flex">
              <div className="w-full text-small font-semibold text-default-foreground">{name}</div>
              <div className="flex-end text-small text-default-400">{time}</div>
            </div>
            <div ref={messageRef} className="mt-2 text-small text-default-900">
              {renderMessageContent()}
            </div>
            {/* 消息状态指示器 */}
            {status && isRTL && (
              <div className="absolute -bottom-5 right-0 text-tiny text-default-400">
                {status === 'sent' && <Icon icon="solar:check-circle-linear" width={16} />}
                {status === 'delivered' && <Icon icon="solar:check-read-linear" width={16} />}
                {status === 'read' && <Icon icon="solar:check-read-linear" width={16} className="text-primary" />}
                {status === 'failed' && <Icon icon="solar:close-circle-linear" width={16} className="text-danger" />}
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div
        {...props}
        ref={ref}
        className={cn(
          "flex gap-3", 
          {"flex-row-reverse": isRTL}, 
          messageType === MessageType.SYSTEM && "justify-center",
          className
        )}
      >
        {messageType !== MessageType.SYSTEM && <MessageAvatar />}
        <Message />
      </div>
    );
  },
);

MessagingChatMessage.displayName = "MessagingChatMessage";

export default MessagingChatMessage;
