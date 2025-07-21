/**
 * 测试工具函数
 * 提供常用的测试辅助功能
 */

/**
 * 模拟WebSocket对象
 */
export class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 100);
  }
  
  send(data) {
    console.log('Mock WebSocket send:', data);
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
  
  mockReceiveMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
}

/**
 * 生成测试用户
 * @param {Object} overrides - 覆盖默认属性
 * @returns {User}
 */
export const createTestUser = (overrides = {}) => ({
  id: 'test_user_' + Math.random().toString(36).substr(2, 9),
  name: '测试用户',
  type: 'kefu',
  avatar: 'https://via.placeholder.com/40',
  sessionToken: 'test_token',
  lastSeen: new Date(),
  ...overrides
});

/**
 * 生成测试消息
 * @param {Object} overrides - 覆盖默认属性
 * @returns {Message}
 */
export const createTestMessage = (overrides = {}) => ({
  id: 'test_msg_' + Math.random().toString(36).substr(2, 9),
  type: 'text',
  content: '测试消息',
  senderId: 'test_sender',
  senderName: '测试发送者',
  timestamp: new Date(),
  status: 'sent',
  ...overrides
});

/**
 * 生成测试客户
 * @param {Object} overrides - 覆盖默认属性
 * @returns {Customer}
 */
export const createTestCustomer = (overrides = {}) => ({
  id: 'test_customer_' + Math.random().toString(36).substr(2, 9),
  name: '测试客户',
  status: 'online',
  avatar: 'https://via.placeholder.com/40',
  lastMessage: '最后一条消息',
  timestamp: new Date(),
  unreadCount: 0,
  messages: [],
  ...overrides
});

/**
 * 等待指定时间
 * @param {number} ms - 毫秒数
 * @returns {Promise}
 */
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 模拟用户输入
 * @param {HTMLInputElement} input - 输入框元素
 * @param {string} value - 输入值
 */
export const simulateUserInput = (input, value) => {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

/**
 * 模拟按键事件
 * @param {HTMLElement} element - 目标元素
 * @param {string} key - 按键名
 */
export const simulateKeyPress = (element, key) => {
  element.dispatchEvent(new KeyboardEvent('keypress', { 
    key, 
    bubbles: true 
  }));
};

/**
 * 检查组件是否正确渲染
 * @param {string} testId - 测试ID
 * @returns {boolean}
 */
export const checkElementExists = (testId) => {
  return document.querySelector(`[data-testid="${testId}"]`) !== null;
};

/**
 * 性能测试助手
 */
export class PerformanceTest {
  constructor() {
    this.marks = new Map();
  }
  
  start(name) {
    this.marks.set(name, performance.now());
  }
  
  end(name) {
    const startTime = this.marks.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.marks.delete(name);
      return duration;
    }
    return null;
  }
  
  measure(name, fn) {
    this.start(name);
    const result = fn();
    const duration = this.end(name);
    console.log(`${name} took ${duration}ms`);
    return result;
  }
}

export default {
  MockWebSocket,
  createTestUser,
  createTestMessage,
  createTestCustomer,
  wait,
  simulateUserInput,
  simulateKeyPress,
  checkElementExists,
  PerformanceTest
};