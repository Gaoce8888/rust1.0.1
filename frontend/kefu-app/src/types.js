// 类型定义文件
// 使用JSDoc为JavaScript项目提供类型支持

/**
 * @typedef {Object} User
 * @property {string} id - 用户ID
 * @property {string} name - 用户名
 * @property {string} type - 用户类型 ('kefu' | 'kehu')
 * @property {string} [avatar] - 头像URL
 * @property {string} [sessionToken] - 会话令牌
 * @property {Date} [lastSeen] - 最后在线时间
 */

/**
 * @typedef {Object} Message
 * @property {string} id - 消息ID
 * @property {MessageType} type - 消息类型
 * @property {string} content - 消息内容
 * @property {string} senderId - 发送者ID
 * @property {string} senderName - 发送者名称
 * @property {string} [senderAvatar] - 发送者头像
 * @property {Date} timestamp - 时间戳
 * @property {string} [customerId] - 关联客户ID
 * @property {MessageStatus} [status] - 消息状态
 * @property {string} [imageUrl] - 图片URL
 * @property {string} [fileName] - 文件名
 * @property {number} [fileSize] - 文件大小
 * @property {string} [fileUrl] - 文件URL
 * @property {number} [voiceDuration] - 语音时长
 * @property {string} [voiceUrl] - 语音URL
 */

/**
 * @typedef {Object} Customer
 * @property {string} id - 客户ID
 * @property {string} name - 客户名称
 * @property {CustomerStatus} status - 客户状态
 * @property {string} [avatar] - 头像URL
 * @property {string} lastMessage - 最后消息
 * @property {Date} timestamp - 最后活动时间
 * @property {number} unreadCount - 未读消息数
 * @property {Message[]} messages - 消息历史
 */

/**
 * @typedef {Object} WebSocketClient
 * @property {function} connect - 连接方法
 * @property {function} disconnect - 断开连接方法
 * @property {function} send - 发送消息方法
 * @property {function} on - 事件监听方法
 * @property {function} off - 取消事件监听方法
 */

/**
 * @typedef {Object} Settings
 * @property {boolean} soundNotifications - 声音通知
 * @property {boolean} autoReply - 自动回复
 * @property {boolean} showTypingIndicator - 显示输入指示器
 * @property {boolean} onlineStatus - 在线状态
 * @property {string} welcomeMessage - 欢迎消息
 * @property {string[]} quickReplies - 快捷回复
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {number} renderCount - 渲染次数
 * @property {number} renderTime - 渲染时间
 * @property {number} lastRenderTime - 最后渲染时间
 * @property {number} averageRenderTime - 平均渲染时间
 * @property {number} memoryUsage - 内存使用量
 * @property {Error[]} errors - 错误列表
 * @property {Warning[]} warnings - 警告列表
 */

/**
 * 消息类型枚举
 * @readonly
 * @enum {string}
 */
export const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  VOICE: 'voice',
  SYSTEM: 'system'
};

/**
 * 消息状态枚举
 * @readonly
 * @enum {string}
 */
export const MessageStatus = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

/**
 * 客户状态枚举
 * @readonly
 * @enum {string}
 */
export const CustomerStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  AWAY: 'away'
};

/**
 * WebSocket事件类型枚举
 * @readonly
 * @enum {string}
 */
export const WSEventType = {
  CHAT: 'Chat',
  USER_JOINED: 'UserJoined',
  USER_LEFT: 'UserLeft',
  ONLINE_USERS: 'OnlineUsers',
  TYPING: 'Typing',
  STATUS: 'Status',
  WELCOME: 'Welcome'
};

/**
 * 连接状态枚举
 * @readonly
 * @enum {string}
 */
export const ConnectionStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  RECONNECTING: 'reconnecting'
};

export {};
