import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  OptimizedPortal, 
  useOptimizedCache, 
  useDebounce, 
  useThrottle,
  PerformanceMonitor,
  ErrorBoundary
} from './EnterpriseCore';
import { notificationManager, NotificationType, NotificationPriority } from './EnterpriseNotifications';

// AI任务类型枚举 - 与后端AITaskType对应
export const AITaskType = {
  INTENT_RECOGNITION: 'IntentRecognition',
  TRANSLATION: 'Translation',
  SPEECH_RECOGNITION: 'SpeechRecognition',
  SENTIMENT_ANALYSIS: 'SentimentAnalysis',
  AUTO_REPLY: 'AutoReply'
};

// AI任务状态枚举 - 与后端AITaskStatus对应
export const AITaskStatus = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled'
};

// AI服务提供商
export const AIProvider = {
  OPENAI: 'openai',
  GOOGLE: 'google',
  AZURE: 'azure',
  AWS: 'aws',
  BAIDU: 'baidu',
  LOCAL: 'local'
};

// AI配置接口
export const AIConfig = {
  enabled: true,
  maxConcurrentTasks: 10,
  taskTimeoutSeconds: 30,
  intentRecognition: {
    enabled: true,
    modelType: 'openai',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    confidenceThreshold: 0.7,
    maxRetries: 3,
    timeoutSeconds: 10,
    supportedLanguages: ['zh', 'en'],
    customIntents: [
      {
        name: 'complaint',
        description: '客户投诉',
        keywords: ['投诉', '不满', '问题'],
        patterns: ['我要投诉', '这个有问题'],
        confidenceBoost: 0.1
      },
      {
        name: 'inquiry',
        description: '咨询问询',
        keywords: ['询问', '咨询', '了解'],
        patterns: ['我想了解', '请问'],
        confidenceBoost: 0.05
      },
      {
        name: 'order',
        description: '订单相关',
        keywords: ['订单', '购买', '下单'],
        patterns: ['我要买', '下单'],
        confidenceBoost: 0.1
      }
    ]
  },
  translation: {
    enabled: true,
    serviceProvider: 'google',
    apiEndpoint: 'https://translation.googleapis.com/language/translate/v2',
    apiKey: '',
    defaultSourceLanguage: 'auto',
    defaultTargetLanguage: 'zh',
    supportedLanguages: [
      { code: 'zh', name: '中文', supportedDirections: ['en', 'ja', 'ko'] },
      { code: 'en', name: 'English', supportedDirections: ['zh', 'ja', 'ko'] },
      { code: 'ja', name: '日本語', supportedDirections: ['zh', 'en', 'ko'] },
      { code: 'ko', name: '한국어', supportedDirections: ['zh', 'en', 'ja'] }
    ],
    autoDetectLanguage: true,
    confidenceThreshold: 0.8,
    maxTextLength: 5000,
    cacheTranslations: true,
    cacheTtlSeconds: 3600
  },
  speechRecognition: {
    enabled: true,
    serviceProvider: 'azure',
    apiEndpoint: 'https://eastasia.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1',
    apiKey: '',
    defaultLanguage: 'zh-CN',
    supportedLanguages: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'],
    supportedFormats: ['wav', 'mp3', 'ogg', 'm4a'],
    maxAudioDurationSeconds: 60,
    maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
    confidenceThreshold: 0.7,
    enablePunctuation: true,
    enableWordTimestamps: true,
    enableSpeakerDiarization: false,
    customVocabulary: []
  },
  sentimentAnalysis: {
    enabled: true,
    modelType: 'openai',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    supportedLanguages: ['zh', 'en'],
    confidenceThreshold: 0.7,
    sentimentCategories: ['positive', 'negative', 'neutral'],
    customKeywords: {}
  },
  autoReply: {
    enabled: true,
    modelType: 'openai',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    maxResponseLength: 500,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    replyTemplates: [
      {
        intent: 'complaint',
        template: '非常抱歉给您带来不便，我们会立即处理您的问题。',
        variables: [],
        priority: 1
      },
      {
        intent: 'inquiry',
        template: '感谢您的咨询，我来为您详细解答。',
        variables: [],
        priority: 2
      },
      {
        intent: 'order',
        template: '好的，我来帮您处理订单相关事宜。',
        variables: [],
        priority: 3
      }
    ],
    contextWindowSize: 10,
    personalization: {
      enabled: true,
      useCustomerHistory: true,
      useCustomerPreferences: true,
      learningRate: 0.1,
      maxHistoryMessages: 50
    }
  }
};

// AI任务类
export class AITask {
  constructor(taskType, userId, messageId, inputData, priority = 2) {
    this.id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.taskType = taskType;
    this.status = AITaskStatus.PENDING;
    this.userId = userId;
    this.messageId = messageId;
    this.inputData = inputData;
    this.outputData = null;
    this.errorMessage = null;
    this.createdAt = new Date();
    this.startedAt = null;
    this.completedAt = null;
    this.priority = priority;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.metadata = new Map();
  }

  startProcessing() {
    this.status = AITaskStatus.PROCESSING;
    this.startedAt = new Date();
  }

  complete(output) {
    this.status = AITaskStatus.COMPLETED;
    this.outputData = output;
    this.completedAt = new Date();
  }

  fail(error) {
    this.status = AITaskStatus.FAILED;
    this.errorMessage = error;
    this.completedAt = new Date();
  }

  canRetry() {
    return this.retryCount < this.maxRetries;
  }

  retry() {
    this.retryCount += 1;
    this.status = AITaskStatus.PENDING;
    this.startedAt = null;
    this.completedAt = null;
    this.errorMessage = null;
  }
}

// AI结果类
export class AIResult {
  constructor(taskId, taskType, userId, messageId, result, confidence = 1.0) {
    this.taskId = taskId;
    this.taskType = taskType;
    this.userId = userId;
    this.messageId = messageId;
    this.result = result;
    this.confidence = confidence;
    this.processingTimeMs = 0;
    this.createdAt = new Date();
  }
}

// AI管理器
export class AIManager {
  constructor() {
    this.tasks = new Map();
    this.results = new Map();
    this.config = AIConfig;
    this.isProcessing = false;
    this.listeners = new Map();
    this.processingQueue = [];
    this.maxConcurrentTasks = this.config.maxConcurrentTasks;
    this.activeTasks = 0;
  }

  // 提交AI任务
  async submitTask(task) {
    this.tasks.set(task.id, task);
    this.processingQueue.push(task.id);
    
    // 触发任务添加事件
    this.emit('taskAdded', task);
    
    // 开始处理队列
    this.processQueue();
    
    return task.id;
  }

  // 获取任务状态
  getTaskStatus(taskId) {
    const task = this.tasks.get(taskId);
    return task ? task.status : null;
  }

  // 获取任务结果
  getTaskResult(taskId) {
    return this.results.get(taskId);
  }

  // 处理任务队列
  async processQueue() {
    if (this.isProcessing || this.activeTasks >= this.maxConcurrentTasks) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0 && this.activeTasks < this.maxConcurrentTasks) {
      const taskId = this.processingQueue.shift();
      const task = this.tasks.get(taskId);
      
      if (task && task.status === AITaskStatus.PENDING) {
        this.activeTasks += 1;
        this.processTask(task).finally(() => {
          this.activeTasks -= 1;
          this.processQueue();
        });
      }
    }

    this.isProcessing = false;
  }

  // 处理单个任务
  async processTask(task) {
    try {
      task.startProcessing();
      this.emit('taskStarted', task);

      const startTime = Date.now();
      let result;

      switch (task.taskType) {
        case AITaskType.INTENT_RECOGNITION:
          result = await this.processIntentRecognition(task);
          break;
        case AITaskType.TRANSLATION:
          result = await this.processTranslation(task);
          break;
        case AITaskType.SPEECH_RECOGNITION:
          result = await this.processSpeechRecognition(task);
          break;
        case AITaskType.SENTIMENT_ANALYSIS:
          result = await this.processSentimentAnalysis(task);
          break;
        case AITaskType.AUTO_REPLY:
          result = await this.processAutoReply(task);
          break;
        default:
          throw new Error(`不支持的AI任务类型: ${task.taskType}`);
      }

      const processingTime = Date.now() - startTime;
      const aiResult = new AIResult(
        task.id,
        task.taskType,
        task.userId,
        task.messageId,
        result,
        result.confidence || 1.0
      );
      aiResult.processingTimeMs = processingTime;

      task.complete(result);
      this.results.set(task.id, aiResult);
      
      this.emit('taskCompleted', task, aiResult);
      
      // 发送成功通知
      notificationManager.add({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.NORMAL,
        title: 'AI处理完成',
        message: `${this.getTaskTypeName(task.taskType)}处理成功`,
        autoDismiss: true,
        dismissDelay: 3000
      });

    } catch (error) {
      console.error(`AI任务处理失败: ${error.message}`);
      
      if (task.canRetry()) {
        task.retry();
        this.processingQueue.push(task.id);
        this.emit('taskRetrying', task);
      } else {
        task.fail(error.message);
        this.emit('taskFailed', task, error);
        
        // 发送失败通知
        notificationManager.add({
          type: NotificationType.ERROR,
          priority: NotificationPriority.HIGH,
          title: 'AI处理失败',
          message: `${this.getTaskTypeName(task.taskType)}处理失败: ${error.message}`,
          autoDismiss: false,
          actions: [
            {
              label: '重试',
              type: 'primary',
              handler: () => {
                task.retry();
                this.processingQueue.push(task.id);
                this.processQueue();
              }
            },
            {
              label: '忽略',
              type: 'secondary',
              dismiss: true
            }
          ]
        });
      }
    }
  }

  // 意图识别处理
  async processIntentRecognition(task) {
    const { text } = task.inputData;
    const config = this.config.intentRecognition;
    
    if (!config.enabled) {
      throw new Error('意图识别功能已禁用');
    }

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // 基于规则的意图识别
    const processedText = text.toLowerCase();
    let bestIntent = 'unknown';
    let bestConfidence = 0.0;

    for (const customIntent of config.customIntents) {
      let confidence = 0.0;
      
      // 检查关键词匹配
      for (const keyword of customIntent.keywords) {
        if (processedText.includes(keyword)) {
          confidence += 0.3;
        }
      }
      
      // 检查模式匹配
      for (const pattern of customIntent.patterns) {
        if (processedText.includes(pattern)) {
          confidence += 0.5;
        }
      }
      
      // 应用置信度提升
      confidence += customIntent.confidenceBoost;
      
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestIntent = customIntent.name;
      }
    }

    // 如果置信度低于阈值，标记为未知
    if (bestConfidence < config.confidenceThreshold) {
      bestIntent = 'unknown';
      bestConfidence = 0.1;
    }

    return {
      intent: bestIntent,
      confidence: bestConfidence,
      entities: [],
      sentiment: this.detectSentiment(text),
      language: this.detectLanguage(text),
      originalText: text
    };
  }

  // 翻译处理
  async processTranslation(task) {
    const { text, sourceLang = 'auto', targetLang = 'zh' } = task.inputData;
    const config = this.config.translation;
    
    if (!config.enabled) {
      throw new Error('翻译功能已禁用');
    }

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

    // 简单的翻译逻辑（实际应该调用翻译API）
    const translations = {
      'en': {
        'zh': {
          'hello': '你好',
          'thank you': '谢谢',
          'goodbye': '再见',
          'how are you': '你好吗'
        }
      },
      'zh': {
        'en': {
          '你好': 'hello',
          '谢谢': 'thank you',
          '再见': 'goodbye',
          '你好吗': 'how are you'
        }
      }
    };

    const detectedLang = sourceLang === 'auto' ? this.detectLanguage(text) : sourceLang;
    const translatedText = translations[detectedLang]?.[targetLang]?.[text.toLowerCase()] || text;

    return {
      originalText: text,
      translatedText: translatedText,
      sourceLanguage: detectedLang,
      targetLanguage: targetLang,
      confidence: 0.9,
      provider: config.serviceProvider,
      cached: false
    };
  }

  // 语音识别处理
  async processSpeechRecognition(task) {
    const { audioData, language = 'zh-CN', format = 'wav' } = task.inputData;
    const config = this.config.speechRecognition;
    
    if (!config.enabled) {
      throw new Error('语音识别功能已禁用');
    }

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    // 模拟语音识别结果
    const sampleTexts = {
      'zh-CN': ['你好，我想咨询一下产品信息', '这个订单什么时候能发货', '我要投诉这个服务'],
      'en-US': ['Hello, I would like to inquire about product information', 'When will this order be shipped', 'I want to complain about this service']
    };

    const texts = sampleTexts[language] || sampleTexts['zh-CN'];
    const randomText = texts[Math.floor(Math.random() * texts.length)];

    return {
      text: randomText,
      confidence: 0.85 + Math.random() * 0.1,
      language: language,
      durationMs: 5000,
      wordTimestamps: [],
      speakerSegments: [],
      provider: config.serviceProvider,
      audioFormat: format,
      sampleRate: 16000
    };
  }

  // 情感分析处理
  async processSentimentAnalysis(task) {
    const { text } = task.inputData;
    const config = this.config.sentimentAnalysis;
    
    if (!config.enabled) {
      throw new Error('情感分析功能已禁用');
    }

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    const sentiment = this.detectSentiment(text);
    const sentimentScore = this.calculateSentimentScore(text);

    return {
      text: text,
      sentiment: sentiment,
      sentimentScore: sentimentScore,
      confidence: 0.8 + Math.random() * 0.15,
      language: this.detectLanguage(text)
    };
  }

  // 自动回复处理
  async processAutoReply(task) {
    const { message, context = [], customerInfo = {} } = task.inputData;
    const config = this.config.autoReply;
    
    if (!config.enabled) {
      throw new Error('自动回复功能已禁用');
    }

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // 基于意图的模板回复
    const intentResult = await this.processIntentRecognition(new AITask(
      AITaskType.INTENT_RECOGNITION,
      task.userId,
      task.messageId,
      { text: message },
      1
    ));

    const intent = intentResult.intent;
    const template = config.replyTemplates.find(t => t.intent === intent);

    let reply = template ? template.template : '感谢您的消息，我会尽快为您处理。';

    // 个性化处理
    if (config.personalization.enabled && customerInfo.name) {
      reply = reply.replace('您', customerInfo.name);
    }

    return {
      originalMessage: message,
      reply: reply,
      intent: intent,
      confidence: intentResult.confidence,
      template: template?.template || null,
      personalization: config.personalization.enabled
    };
  }

  // 辅助方法
  detectLanguage(text) {
    const chineseChars = text.match(/[\u4e00-\u9fff]/g)?.length || 0;
    const englishChars = text.match(/[a-zA-Z]/g)?.length || 0;
    const japaneseChars = text.match(/[\u3040-\u309f\u30a0-\u30ff]/g)?.length || 0;
    
    if (chineseChars > text.length / 3) return 'zh';
    if (japaneseChars > text.length / 3) return 'ja';
    if (englishChars > text.length / 2) return 'en';
    return 'auto';
  }

  detectSentiment(text) {
    const positiveWords = ['好', '棒', '赞', '喜欢', '满意', '优秀', 'great', 'good', 'excellent', 'amazing'];
    const negativeWords = ['差', '坏', '糟', '不满', '投诉', '问题', 'bad', 'terrible', 'awful', 'horrible'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  calculateSentimentScore(text) {
    const sentiment = this.detectSentiment(text);
    switch (sentiment) {
      case 'positive': return 0.7 + Math.random() * 0.3;
      case 'negative': return 0.0 + Math.random() * 0.3;
      default: return 0.4 + Math.random() * 0.2;
    }
  }

  getTaskTypeName(taskType) {
    const names = {
      [AITaskType.INTENT_RECOGNITION]: '意图识别',
      [AITaskType.TRANSLATION]: '翻译',
      [AITaskType.SPEECH_RECOGNITION]: '语音识别',
      [AITaskType.SENTIMENT_ANALYSIS]: '情感分析',
      [AITaskType.AUTO_REPLY]: '自动回复'
    };
    return names[taskType] || '未知任务';
  }

  // 事件系统
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`AI事件处理器错误 (${event}):`, error);
        }
      });
    }
  }

  // 获取统计信息
  getStatistics() {
    const tasks = Array.from(this.tasks.values());
    const results = Array.from(this.results.values());
    
    return {
      totalTasks: tasks.length,
      completedTasks: results.length,
      failedTasks: tasks.filter(t => t.status === AITaskStatus.FAILED).length,
      pendingTasks: tasks.filter(t => t.status === AITaskStatus.PENDING).length,
      processingTasks: tasks.filter(t => t.status === AITaskStatus.PROCESSING).length,
      activeTasks: this.activeTasks,
      queueLength: this.processingQueue.length,
      averageProcessingTime: results.length > 0 
        ? results.reduce((sum, r) => sum + r.processingTimeMs, 0) / results.length 
        : 0
    };
  }
}

// 全局AI管理器实例
export const aiManager = new AIManager();

// AI任务组件
export const AITaskComponent = React.memo(({ 
  task, 
  onComplete, 
  onError,
  className = ""
}) => {
  const [status, setStatus] = useState(task.status);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleTaskStarted = (startedTask) => {
      if (startedTask.id === task.id) {
        setStatus(startedTask.status);
      }
    };

    const handleTaskCompleted = (completedTask, taskResult) => {
      if (completedTask.id === task.id) {
        setStatus(completedTask.status);
        setResult(taskResult);
        onComplete?.(taskResult);
      }
    };

    const handleTaskFailed = (failedTask, taskError) => {
      if (failedTask.id === task.id) {
        setStatus(failedTask.status);
        setError(taskError);
        onError?.(taskError);
      }
    };

    aiManager.on('taskStarted', handleTaskStarted);
    aiManager.on('taskCompleted', handleTaskCompleted);
    aiManager.on('taskFailed', handleTaskFailed);

    return () => {
      aiManager.off('taskStarted', handleTaskStarted);
      aiManager.off('taskCompleted', handleTaskCompleted);
      aiManager.off('taskFailed', handleTaskFailed);
    };
  }, [task.id, onComplete, onError]);

  const getStatusIcon = () => {
    switch (status) {
      case AITaskStatus.PENDING: return '⏳';
      case AITaskStatus.PROCESSING: return '🔄';
      case AITaskStatus.COMPLETED: return '✅';
      case AITaskStatus.FAILED: return '❌';
      case AITaskStatus.CANCELLED: return '🚫';
      default: return '❓';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case AITaskStatus.PENDING: return 'var(--warning-color)';
      case AITaskStatus.PROCESSING: return 'var(--primary-color)';
      case AITaskStatus.COMPLETED: return 'var(--success-color)';
      case AITaskStatus.FAILED: return 'var(--error-color)';
      case AITaskStatus.CANCELLED: return 'var(--gray-500)';
      default: return 'var(--gray-400)';
    }
  };

  return (
    <div className={`ai-task ${className}`}>
      <div className="task-header">
        <div className="task-status">
          <span className="status-icon" style={{ color: getStatusColor() }}>
            {getStatusIcon()}
          </span>
          <span className="status-text">{status}</span>
        </div>
        <div className="task-type">{aiManager.getTaskTypeName(task.taskType)}</div>
      </div>
      
      <div className="task-content">
        <div className="task-input">
          <strong>输入:</strong> {JSON.stringify(task.inputData)}
        </div>
        
        {result && (
          <div className="task-result">
            <strong>结果:</strong> {JSON.stringify(result.result)}
          </div>
        )}
        
        {error && (
          <div className="task-error">
            <strong>错误:</strong> {error.message}
          </div>
        )}
      </div>
      
      <div className="task-meta">
        <span>ID: {task.id}</span>
        <span>优先级: {task.priority}</span>
        {task.retryCount > 0 && <span>重试: {task.retryCount}</span>}
      </div>
    </div>
  );
});

// AI控制面板组件
export const AIControlPanel = React.memo(({ 
  className = ""
}) => {
  const [tasks, setTasks] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [config, setConfig] = useState(AIConfig);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    const handleTaskAdded = (task) => {
      setTasks(prev => [task, ...prev]);
    };

    const handleTaskCompleted = (task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    };

    const handleTaskFailed = (task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    };

    aiManager.on('taskAdded', handleTaskAdded);
    aiManager.on('taskCompleted', handleTaskCompleted);
    aiManager.on('taskFailed', handleTaskFailed);

    // 定期更新统计信息
    const interval = setInterval(() => {
      setStatistics(aiManager.getStatistics());
    }, 1000);

    return () => {
      aiManager.off('taskAdded', handleTaskAdded);
      aiManager.off('taskCompleted', handleTaskCompleted);
      aiManager.off('taskFailed', handleTaskFailed);
      clearInterval(interval);
    };
  }, []);

  const handleSubmitTask = useCallback((taskType, inputData) => {
    const task = new AITask(
      taskType,
      'current_user',
      `msg_${Date.now()}`,
      inputData,
      2
    );
    
    aiManager.submitTask(task);
  }, []);

  const handleClearTasks = useCallback(() => {
    setTasks([]);
  }, []);

  const handleUpdateConfig = useCallback((newConfig) => {
    setConfig(newConfig);
    setIsConfigOpen(false);
  }, []);

  return (
    <div className={`ai-control-panel ${className}`}>
      <div className="panel-header">
        <h3>AI控制面板</h3>
        <div className="panel-actions">
          <button onClick={() => setIsConfigOpen(true)}>配置</button>
          <button onClick={handleClearTasks}>清空任务</button>
        </div>
      </div>

      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-value">{statistics.totalTasks || 0}</div>
          <div className="stat-label">总任务数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.completedTasks || 0}</div>
          <div className="stat-label">已完成</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.failedTasks || 0}</div>
          <div className="stat-label">失败</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.activeTasks || 0}</div>
          <div className="stat-label">进行中</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statistics.queueLength || 0}</div>
          <div className="stat-label">队列中</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(statistics.averageProcessingTime || 0)}ms</div>
          <div className="stat-label">平均处理时间</div>
        </div>
      </div>

      <div className="task-list">
        <h4>任务列表</h4>
        {tasks.length === 0 ? (
          <div className="empty-state">暂无任务</div>
        ) : (
          tasks.map(task => (
            <AITaskComponent
              key={task.id}
              task={task}
              onComplete={(result) => console.log('任务完成:', result)}
              onError={(error) => console.error('任务失败:', error)}
            />
          ))
        )}
      </div>

      {isConfigOpen && (
        <AIConfigModal
          config={config}
          onSave={handleUpdateConfig}
          onCancel={() => setIsConfigOpen(false)}
        />
      )}
    </div>
  );
});

// AI配置模态框组件
export const AIConfigModal = React.memo(({ 
  config, 
  onSave, 
  onCancel,
  className = ""
}) => {
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = useCallback(() => {
    onSave(localConfig);
  }, [localConfig, onSave]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return (
    <OptimizedPortal>
      <div className="ai-config-modal-overlay">
        <div className={`ai-config-modal ${className}`}>
          <div className="modal-header">
            <h3>AI配置</h3>
            <button onClick={handleCancel}>×</button>
          </div>
          
          <div className="modal-content">
            <div className="config-section">
              <h4>通用设置</h4>
              <label>
                <input
                  type="checkbox"
                  checked={localConfig.enabled}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    enabled: e.target.checked
                  }))}
                />
                启用AI功能
              </label>
              <label>
                最大并发任务数:
                <input
                  type="number"
                  value={localConfig.maxConcurrentTasks}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    maxConcurrentTasks: parseInt(e.target.value)
                  }))}
                />
              </label>
            </div>

            <div className="config-section">
              <h4>意图识别</h4>
              <label>
                <input
                  type="checkbox"
                  checked={localConfig.intentRecognition.enabled}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    intentRecognition: {
                      ...prev.intentRecognition,
                      enabled: e.target.checked
                    }
                  }))}
                />
                启用意图识别
              </label>
            </div>

            <div className="config-section">
              <h4>翻译</h4>
              <label>
                <input
                  type="checkbox"
                  checked={localConfig.translation.enabled}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    translation: {
                      ...prev.translation,
                      enabled: e.target.checked
                    }
                  }))}
                />
                启用翻译
              </label>
            </div>

            <div className="config-section">
              <h4>语音识别</h4>
              <label>
                <input
                  type="checkbox"
                  checked={localConfig.speechRecognition.enabled}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    speechRecognition: {
                      ...prev.speechRecognition,
                      enabled: e.target.checked
                    }
                  }))}
                />
                启用语音识别
              </label>
            </div>

            <div className="config-section">
              <h4>情感分析</h4>
              <label>
                <input
                  type="checkbox"
                  checked={localConfig.sentimentAnalysis.enabled}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    sentimentAnalysis: {
                      ...prev.sentimentAnalysis,
                      enabled: e.target.checked
                    }
                  }))}
                />
                启用情感分析
              </label>
            </div>

            <div className="config-section">
              <h4>自动回复</h4>
              <label>
                <input
                  type="checkbox"
                  checked={localConfig.autoReply.enabled}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    autoReply: {
                      ...prev.autoReply,
                      enabled: e.target.checked
                    }
                  }))}
                />
                启用自动回复
              </label>
            </div>
          </div>
          
          <div className="modal-footer">
            <button onClick={handleCancel}>取消</button>
            <button onClick={handleSave} className="primary">保存</button>
          </div>
        </div>
      </div>
    </OptimizedPortal>
  );
});

// React Hook for AI管理
export const useAI = () => {
  const [tasks, setTasks] = useState([]);
  const [statistics, setStatistics] = useState({});

  useEffect(() => {
    const handleTaskAdded = (task) => {
      setTasks(prev => [task, ...prev]);
    };

    const handleTaskCompleted = (task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    };

    const handleTaskFailed = (task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    };

    aiManager.on('taskAdded', handleTaskAdded);
    aiManager.on('taskCompleted', handleTaskCompleted);
    aiManager.on('taskFailed', handleTaskFailed);

    const interval = setInterval(() => {
      setStatistics(aiManager.getStatistics());
    }, 1000);

    return () => {
      aiManager.off('taskAdded', handleTaskAdded);
      aiManager.off('taskCompleted', handleTaskCompleted);
      aiManager.off('taskFailed', handleTaskFailed);
      clearInterval(interval);
    };
  }, []);

  const submitTask = useCallback((taskType, inputData, priority = 2) => {
    const task = new AITask(taskType, 'current_user', `msg_${Date.now()}`, inputData, priority);
    return aiManager.submitTask(task);
  }, []);

  const getTaskStatus = useCallback((taskId) => {
    return aiManager.getTaskStatus(taskId);
  }, []);

  const getTaskResult = useCallback((taskId) => {
    return aiManager.getTaskResult(taskId);
  }, []);

  return {
    tasks,
    statistics,
    submitTask,
    getTaskStatus,
    getTaskResult,
    aiManager
  };
};

// 导出所有组件和工具
export default {
  AITaskType,
  AITaskStatus,
  AIProvider,
  AIConfig,
  AITask,
  AIResult,
  AIManager,
  aiManager,
  AITaskComponent,
  AIControlPanel,
  AIConfigModal,
  useAI
};