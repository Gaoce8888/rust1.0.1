/**
 * 输入验证工具
 */

// 验证字符串输入
export const validateString = (input, options = {}) => {
  const {
    minLength = 0,
    maxLength = 1000,
    required = false,
    pattern = null,
    trim = true,
  } = options;

  // 类型检查
  if (typeof input !== 'string') {
    throw new Error('输入必须是字符串');
  }

  // 去除首尾空格
  const trimmedInput = trim ? input.trim() : input;

  // 必填检查
  if (required && !trimmedInput) {
    throw new Error('输入不能为空');
  }

  // 长度检查
  if (trimmedInput.length < minLength) {
    throw new Error(`输入长度不能少于 ${minLength} 个字符`);
  }

  if (trimmedInput.length > maxLength) {
    throw new Error(`输入长度不能超过 ${maxLength} 个字符`);
  }

  // 正则表达式检查
  if (pattern && !pattern.test(trimmedInput)) {
    throw new Error('输入格式不正确');
  }

  return trimmedInput;
};

// 验证邮箱
export const validateEmail = (email) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return validateString(email, {
    required: true,
    pattern: emailPattern,
    maxLength: 254,
  });
};

// 验证用户名
export const validateUsername = (username) => {
  const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
  return validateString(username, {
    required: true,
    pattern: usernamePattern,
    minLength: 3,
    maxLength: 20,
  });
};

// 验证密码
export const validatePassword = (password) => {
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return validateString(password, {
    required: true,
    pattern: passwordPattern,
    minLength: 8,
    maxLength: 128,
  });
};

// 验证数字
export const validateNumber = (input, options = {}) => {
  const {
    min = -Infinity,
    max = Infinity,
    required = false,
    integer = false,
  } = options;

  // 类型检查
  if (typeof input !== 'number' && typeof input !== 'string') {
    throw new Error('输入必须是数字');
  }

  const num = typeof input === 'string' ? parseFloat(input) : input;

  // 检查是否为有效数字
  if (isNaN(num)) {
    throw new Error('输入不是有效的数字');
  }

  // 必填检查
  if (required && (num === 0 || num === null || num === undefined)) {
    throw new Error('输入不能为空');
  }

  // 整数检查
  if (integer && !Number.isInteger(num)) {
    throw new Error('输入必须是整数');
  }

  // 范围检查
  if (num < min) {
    throw new Error(`输入不能小于 ${min}`);
  }

  if (num > max) {
    throw new Error(`输入不能大于 ${max}`);
  }

  return num;
};

// 验证数组
export const validateArray = (input, options = {}) => {
  const {
    minLength = 0,
    maxLength = Infinity,
    required = false,
    itemValidator = null,
  } = options;

  // 类型检查
  if (!Array.isArray(input)) {
    throw new Error('输入必须是数组');
  }

  // 必填检查
  if (required && input.length === 0) {
    throw new Error('数组不能为空');
  }

  // 长度检查
  if (input.length < minLength) {
    throw new Error(`数组长度不能少于 ${minLength} 个元素`);
  }

  if (input.length > maxLength) {
    throw new Error(`数组长度不能超过 ${maxLength} 个元素`);
  }

  // 元素验证
  if (itemValidator) {
    input.forEach((item, index) => {
      try {
        itemValidator(item);
      } catch (error) {
        throw new Error(`数组第 ${index + 1} 个元素验证失败: ${error.message}`);
      }
    });
  }

  return input;
};

// 验证对象
export const validateObject = (input, schema = {}, options = {}) => {
  const { required = false, allowUnknown = false } = options;

  // 类型检查
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('输入必须是对象');
  }

  // 必填检查
  if (required && Object.keys(input).length === 0) {
    throw new Error('对象不能为空');
  }

  const validatedObject = {};

  // 验证已知字段
  for (const [key, validator] of Object.entries(schema)) {
    if (key in input) {
      try {
        validatedObject[key] = validator(input[key]);
      } catch (error) {
        throw new Error(`字段 ${key} 验证失败: ${error.message}`);
      }
    } else if (validator.required) {
      throw new Error(`缺少必填字段 ${key}`);
    }
  }

  // 检查未知字段
  if (!allowUnknown) {
    const unknownKeys = Object.keys(input).filter(key => !(key in schema));
    if (unknownKeys.length > 0) {
      throw new Error(`包含未知字段: ${unknownKeys.join(', ')}`);
    }
  }

  return validatedObject;
};

// 验证文件
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = [],
    required = false,
  } = options;

  // 类型检查
  if (!(file instanceof File)) {
    throw new Error('输入必须是文件对象');
  }

  // 必填检查
  if (required && !file) {
    throw new Error('文件不能为空');
  }

  // 文件大小检查
  if (file.size > maxSize) {
    throw new Error(`文件大小不能超过 ${maxSize / 1024 / 1024}MB`);
  }

  // 文件类型检查
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new Error(`不支持的文件类型: ${file.type}`);
  }

  return file;
};

// 验证URL
export const validateUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch (error) {
    throw new Error('无效的URL格式');
  }
};

// 验证日期
export const validateDate = (date, options = {}) => {
  const { min = new Date(1900, 0, 1), max = new Date(2100, 11, 31) } = options;

  let dateObj;

  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    throw new Error('输入必须是日期对象或日期字符串');
  }

  if (isNaN(dateObj.getTime())) {
    throw new Error('无效的日期格式');
  }

  if (dateObj < min) {
    throw new Error(`日期不能早于 ${min.toLocaleDateString()}`);
  }

  if (dateObj > max) {
    throw new Error(`日期不能晚于 ${max.toLocaleDateString()}`);
  }

  return dateObj;
};

// 防XSS的HTML转义
export const escapeHtml = (str) => {
  if (typeof str !== 'string') {
    return str;
  }

  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
};

// 安全的JSON解析
export const safeJsonParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.warn('JSON解析失败:', error);
    return defaultValue;
  }
};

// 验证消息内容
export const validateMessageContent = (content, type = 'text') => {
  switch (type) {
    case 'text':
      return validateString(content, {
        required: true,
        maxLength: 1000,
        trim: true,
      });
    
    case 'image':
      return validateUrl(content);
    
    case 'file':
      return validateString(content, {
        required: true,
        maxLength: 500,
      });
    
    case 'voice':
      return validateString(content, {
        required: true,
        maxLength: 500,
      });
    
    default:
      throw new Error(`不支持的消息类型: ${type}`);
  }
};

// 验证用户输入
export const validateUserInput = (input) => {
  return validateObject(input, {
    username: validateUsername,
    email: validateEmail,
    password: validatePassword,
  });
};

// 验证客户数据
export const validateCustomerData = (customer) => {
  return validateObject(customer, {
    id: (id) => validateString(id, { required: true, minLength: 1 }),
    name: (name) => validateString(name, { required: true, minLength: 1, maxLength: 100 }),
    status: (status) => validateString(status, { 
      required: true, 
      pattern: /^(online|offline|away|busy)$/ 
    }),
  }, { allowUnknown: true });
};