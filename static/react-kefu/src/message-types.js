 // 消息类型定义
export const MessageType = {
    TEXT: 'text',           // 文本消息
    IMAGE: 'image',         // 图片消息
    FILE: 'file',           // 文件消息
    VOICE: 'voice',         // 语音消息
    SYSTEM: 'system',       // 系统消息
    TYPING: 'typing',       // 正在输入提示
  };
  
  // 消息状态
  export const MessageStatus = {
    SENDING: 'sending',     // 发送中
    SENT: 'sent',          // 已发送
    DELIVERED: 'delivered', // 已送达
    READ: 'read',          // 已读
    FAILED: 'failed',      // 发送失败
  };
  
  // 文件类型
  export const FileType = {
    IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    DOCUMENT: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
    VIDEO: ['mp4', 'avi', 'mov', 'wmv'],
    AUDIO: ['mp3', 'wav', 'ogg', 'm4a'],
  };
  
  // 消息数据结构
  export class Message {
    constructor(data) {
      this.id = data.id || Date.now().toString();
      this.type = data.type || MessageType.TEXT;
      this.content = data.content || '';
      this.senderId = data.senderId;
      this.senderName = data.senderName;
      this.senderAvatar = data.senderAvatar;
      this.receiverId = data.receiverId;
      this.timestamp = data.timestamp || new Date();
      this.status = data.status || MessageStatus.SENDING;
      
      // 特定类型的额外数据
      this.imageUrl = data.imageUrl;
      this.fileName = data.fileName;
      this.fileSize = data.fileSize;
      this.fileUrl = data.fileUrl;
      this.voiceDuration = data.voiceDuration;
      this.voiceUrl = data.voiceUrl;
      this.thumbnailUrl = data.thumbnailUrl;
    }
  }
  
  // 文件大小格式化
  export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // 获取文件扩展名
  export function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }
  
  // 判断是否为图片文件
  export function isImageFile(filename) {
    const ext = getFileExtension(filename);
    return FileType.IMAGE.includes(ext);
  }