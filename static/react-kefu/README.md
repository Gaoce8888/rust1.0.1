 # 客服系统前端通讯配置说明

本项目实现了一个完整的客服聊天系统前端，支持文字、图片、文件和语音消息的发送和接收。

## 功能特性

### 1. 消息类型支持

- **文本消息**：普通文字聊天
- **图片消息**：支持图片预览和发送（最大5MB）
- **文件消息**：支持文档上传和下载（最大10MB）
- **语音消息**：支持语音录制和播放（最长60秒）
- **系统消息**：系统通知和提示

### 2. 实时通信

- **WebSocket连接**：实时双向通信
- **自动重连**：断线后自动重连机制
- **心跳检测**：保持连接活跃
- **消息状态**：发送中、已发送、已送达、已读、失败

### 3. 用户界面

- **侧边栏**：显示在线客户列表
- **聊天面板**：消息显示和输入
- **增强输入框**：支持多种消息类型的快捷发送
- **状态指示**：连接状态、输入状态、在线状态

## 核心组件

### `messaging-chat-message.js`
增强版消息组件，支持多种消息类型的显示：
- 文本消息显示
- 图片预览和点击放大
- 文件下载按钮
- 语音播放控制
- 消息状态指示器

### `enhanced-prompt-input.js`
增强版输入组件，支持：
- 文本输入和发送
- 图片选择和预览
- 文件选择和上传
- 语音录制（按住说话）
- 附件菜单

### `websocket-client.js`
WebSocket客户端封装：
- 连接管理
- 消息发送和接收
- 事件监听机制
- 文件上传处理
- 自动重连逻辑

### `sidebar-with-chat-history.js`
侧边栏组件，显示：
- 客服人员信息
- 在线客户列表
- 客户状态和最后消息
- 未读消息计数
- 操作菜单

## 前后端通信协议

### WebSocket消息格式

```javascript
// 发送消息
{
  type: "message",
  messageType: "text|image|file|voice",
  content: "消息内容",
  receiverId: "接收者ID",
  timestamp: "2024-01-01T12:00:00Z"
}

// 接收消息
{
  type: "message",
  id: "消息ID",
  messageType: "text|image|file|voice",
  content: "消息内容",
  senderId: "发送者ID",
  senderName: "发送者名称",
  senderAvatar: "头像URL",
  timestamp: "2024-01-01T12:00:00Z",
  // 特定类型的额外字段
  imageUrl: "图片URL",
  fileName: "文件名",
  fileSize: 1024,
  fileUrl: "文件URL",
  voiceDuration: 15,
  voiceUrl: "语音URL"
}

// 状态更新
{
  type: "messageStatus",
  messageId: "消息ID",
  status: "sent|delivered|read"
}

// 正在输入
{
  type: "typing",
  userId: "用户ID",
  isTyping: true
}
```

### HTTP API端点

- `POST /api/file/upload` - 文件上传
- `POST /api/image/upload` - 图片上传
- `POST /api/voice/upload` - 语音上传
- `GET /api/messages` - 获取历史消息
- `POST /api/message/send` - 发送消息（备用）

## 使用说明

### 1. 配置WebSocket连接

```javascript
const wsClient = getWebSocketClient('ws://localhost:6006/ws', {
  userId: 'kf001',
  userType: 'kefu'
});
```

### 2. 监听消息事件

```javascript
wsClient.on('message', (data) => {
  // 处理接收到的消息
});

wsClient.on('connected', () => {
  // 连接成功
});
```

### 3. 发送不同类型的消息

```javascript
// 文本消息
handleSendMessage({
  type: 'text',
  content: '你好'
});

// 图片消息
handleSendMessage({
  type: 'image',
  file: imageFile,
  imageUrl: previewUrl
});

// 文件消息
handleSendMessage({
  type: 'file',
  file: documentFile,
  fileName: 'document.pdf',
  fileSize: 1024000
});

// 语音消息
handleSendMessage({
  type: 'voice',
  voiceDuration: 15,
  voiceBlob: audioBlob
});
```

## 注意事项

1. **文件大小限制**：
   - 图片最大 5MB
   - 文件最大 10MB
   - 语音最长 60秒

2. **浏览器兼容性**：
   - 需要支持 WebSocket
   - 语音功能需要麦克风权限
   - 建议使用现代浏览器

3. **安全性**：
   - 文件上传前进行类型和大小验证
   - WebSocket连接需要认证
   - 敏感信息应加密传输

## 后续优化

1. 添加消息加密
2. 实现断点续传
3. 添加消息撤回功能
4. 支持群聊功能
5. 添加表情和贴纸
6. 实现屏幕共享
7. 添加视频通话功能