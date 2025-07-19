/**
 * 消息类型和工具函数定义
 * 定义了聊天系统中所有的消息类型、状态和相关工具函数
 */

/**
 * 消息类型枚举
 * 定义系统支持的所有消息类型
 */
export const MessageType = {
    TEXT: 'text',           // 文本消息
    IMAGE: 'image',         // 图片消息
    FILE: 'file',           // 文件消息
    VOICE: 'voice',         // 语音消息
    SYSTEM: 'system',       // 系统消息
    TYPING: 'typing',       // 正在输入提示
  };
  
  /**
   * 消息状态枚举
   * 追踪消息的发送和接收状态
   */
  export const MessageStatus = {
    SENDING: 'sending',     // 发送中
    SENT: 'sent',          // 已发送
    DELIVERED: 'delivered', // 已送达
    READ: 'read',          // 已读
    FAILED: 'failed',      // 发送失败
  };
  
  /**
   * 文件类型分类
   * 根据扩展名对文件进行分类
   */
  export const FileType = {
    IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    DOCUMENT: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
    VIDEO: ['mp4', 'avi', 'mov', 'wmv'],
    AUDIO: ['mp3', 'wav', 'ogg', 'm4a'],
  };
  
  /**
   * 消息数据结构类
   * 统一的消息数据格式，便于管理和传输
   */
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
  
  /**
   * 文件大小格式化
   * 将字节数转换为人类可读的格式
   * @param {number} bytes - 文件大小（字节）
   * @returns {string} 格式化后的文件大小（如：2.5 MB）
   */
  export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * 获取文件扩展名
   * @param {string} filename - 文件名
   * @returns {string} 小写的文件扩展名
   */
  export function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }
  
  /**
   * 判断是否为图片文件
   * @param {string} filename - 文件名
   * @returns {boolean} 是否为支持的图片格式
   */
  export function isImageFile(filename) {
    const ext = getFileExtension(filename);
    return FileType.IMAGE.includes(ext);
  }