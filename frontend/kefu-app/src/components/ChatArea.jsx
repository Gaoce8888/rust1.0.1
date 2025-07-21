import React from 'react';
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
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
              currentCustomer.status === 'online' ? 'bg-success' : 'bg-default-300'
            }`} />
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
