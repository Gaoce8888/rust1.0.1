import React, { useState, useCallback } from 'react';
import { 
  AIControlPanel, 
  AITaskComponent,
  useAI,
  AITaskType,
  AITask,
  aiManager,
  AIConfig
} from './EnterpriseAI';
import { notificationManager, NotificationType, NotificationPriority } from './EnterpriseNotifications';
import './EnterpriseAI.css';

// AI功能示例组件
export const EnterpriseAIExample = React.memo(({ className = "" }) => {
  const { tasks, statistics, submitTask } = useAI();
  const [selectedTaskType, setSelectedTaskType] = useState(AITaskType.INTENT_RECOGNITION);
  const [inputText, setInputText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('zh');
  const [audioFile, setAudioFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 处理任务提交
  const handleSubmitTask = useCallback(async () => {
    if (!inputText.trim() && selectedTaskType !== AITaskType.SPEECH_RECOGNITION) {
      notificationManager.add({
        type: NotificationType.WARNING,
        priority: NotificationPriority.NORMAL,
        title: '输入验证',
        message: '请输入要处理的文本内容',
        autoDismiss: true,
        dismissDelay: 3000
      });
      return;
    }

    if (selectedTaskType === AITaskType.SPEECH_RECOGNITION && !audioFile) {
      notificationManager.add({
        type: NotificationType.WARNING,
        priority: NotificationPriority.NORMAL,
        title: '文件验证',
        message: '请选择音频文件',
        autoDismiss: true,
        dismissDelay: 3000
      });
      return;
    }

    setIsProcessing(true);

    try {
      let inputData = {};

      switch (selectedTaskType) {
        case AITaskType.INTENT_RECOGNITION:
          inputData = { text: inputText };
          break;
        case AITaskType.TRANSLATION:
          inputData = { 
            text: inputText, 
            sourceLang, 
            targetLang 
          };
          break;
        case AITaskType.SPEECH_RECOGNITION:
          inputData = { 
            audioData: 'audio_file_data', // 实际应该是文件数据
            language: 'zh-CN',
            format: audioFile?.name.split('.').pop() || 'wav'
          };
          break;
        case AITaskType.SENTIMENT_ANALYSIS:
          inputData = { text: inputText };
          break;
        case AITaskType.AUTO_REPLY:
          inputData = { 
            message: inputText,
            context: [],
            customerInfo: { name: '测试客户' }
          };
          break;
        default:
          inputData = { text: inputText };
      }

      const taskId = await submitTask(selectedTaskType, inputData, 2);
      
      notificationManager.add({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.NORMAL,
        title: '任务提交成功',
        message: `AI任务已提交，任务ID: ${taskId}`,
        autoDismiss: true,
        dismissDelay: 3000
      });

      // 清空输入
      setInputText('');
      setAudioFile(null);

    } catch (error) {
      notificationManager.add({
        type: NotificationType.ERROR,
        priority: NotificationPriority.HIGH,
        title: '任务提交失败',
        message: error.message,
        autoDismiss: false
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedTaskType, inputText, sourceLang, targetLang, audioFile, submitTask]);

  // 快速测试任务
  const handleQuickTest = useCallback((taskType) => {
    const testData = {
      [AITaskType.INTENT_RECOGNITION]: '我要投诉这个产品的质量问题',
      [AITaskType.TRANSLATION]: 'Hello, how are you today?',
      [AITaskType.SENTIMENT_ANALYSIS]: '这个服务真的很棒，我非常满意！',
      [AITaskType.AUTO_REPLY]: '我想了解一下你们的产品信息'
    };

    setSelectedTaskType(taskType);
    setInputText(testData[taskType] || '');
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      // 验证文件类型
      const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a'];
      if (!allowedTypes.includes(file.type)) {
        notificationManager.add({
          type: NotificationType.ERROR,
          priority: NotificationPriority.NORMAL,
          title: '文件类型错误',
          message: '请选择支持的音频文件格式 (WAV, MP3, OGG, M4A)',
          autoDismiss: true,
          dismissDelay: 5000
        });
        return;
      }

      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        notificationManager.add({
          type: NotificationType.ERROR,
          priority: NotificationPriority.NORMAL,
          title: '文件过大',
          message: '音频文件大小不能超过10MB',
          autoDismiss: true,
          dismissDelay: 5000
        });
        return;
      }

      setAudioFile(file);
    }
  }, []);

  return (
    <div className={`enterprise-ai-example ${className}`}>
      <div className="example-header">
        <h2>🤖 AI功能演示</h2>
        <p>体验企业级AI功能，包括意图识别、翻译、语音识别、情感分析和自动回复</p>
      </div>

      <div className="example-content">
        {/* 快速测试按钮 */}
        <div className="quick-test-section">
          <h3>快速测试</h3>
          <div className="quick-test-buttons">
            <button 
              onClick={() => handleQuickTest(AITaskType.INTENT_RECOGNITION)}
              className="test-btn intent"
            >
              🎯 意图识别测试
            </button>
            <button 
              onClick={() => handleQuickTest(AITaskType.TRANSLATION)}
              className="test-btn translation"
            >
              🌐 翻译测试
            </button>
            <button 
              onClick={() => handleQuickTest(AITaskType.SENTIMENT_ANALYSIS)}
              className="test-btn sentiment"
            >
              😊 情感分析测试
            </button>
            <button 
              onClick={() => handleQuickTest(AITaskType.AUTO_REPLY)}
              className="test-btn auto-reply"
            >
              💬 自动回复测试
            </button>
          </div>
        </div>

        {/* 任务配置 */}
        <div className="task-config-section">
          <h3>任务配置</h3>
          
          <div className="config-row">
            <label>任务类型:</label>
            <select 
              value={selectedTaskType} 
              onChange={(e) => setSelectedTaskType(e.target.value)}
            >
              <option value={AITaskType.INTENT_RECOGNITION}>意图识别</option>
              <option value={AITaskType.TRANSLATION}>翻译</option>
              <option value={AITaskType.SPEECH_RECOGNITION}>语音识别</option>
              <option value={AITaskType.SENTIMENT_ANALYSIS}>情感分析</option>
              <option value={AITaskType.AUTO_REPLY}>自动回复</option>
            </select>
          </div>

          {selectedTaskType === AITaskType.TRANSLATION && (
            <div className="translation-config">
              <div className="config-row">
                <label>源语言:</label>
                <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
                  <option value="auto">自动检测</option>
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                </select>
              </div>
              <div className="config-row">
                <label>目标语言:</label>
                <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                </select>
              </div>
            </div>
          )}

          {selectedTaskType === AITaskType.SPEECH_RECOGNITION ? (
            <div className="audio-input">
              <label>音频文件:</label>
              <input 
                type="file" 
                accept="audio/*"
                onChange={handleFileSelect}
              />
              {audioFile && (
                <div className="file-info">
                  <span>已选择: {audioFile.name}</span>
                  <span>大小: {(audioFile.size / 1024 / 1024).toFixed(2)}MB</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-input">
              <label>输入内容:</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`请输入要${getTaskTypeDescription(selectedTaskType)}的内容...`}
                rows={4}
              />
            </div>
          )}

          <button 
            onClick={handleSubmitTask}
            disabled={isProcessing}
            className="submit-btn"
          >
            {isProcessing ? '处理中...' : '提交任务'}
          </button>
        </div>

        {/* 统计信息 */}
        <div className="statistics-section">
          <h3>处理统计</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">{statistics.totalTasks || 0}</div>
              <div className="stat-label">总任务数</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{statistics.completedTasks || 0}</div>
              <div className="stat-label">已完成</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{statistics.failedTasks || 0}</div>
              <div className="stat-label">失败</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{statistics.activeTasks || 0}</div>
              <div className="stat-label">进行中</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{Math.round(statistics.averageProcessingTime || 0)}ms</div>
              <div className="stat-label">平均处理时间</div>
            </div>
          </div>
        </div>

        {/* 任务列表 */}
        <div className="tasks-section">
          <h3>任务列表</h3>
          {tasks.length === 0 ? (
            <div className="empty-tasks">
              <p>暂无任务，请提交一个AI任务开始体验</p>
            </div>
          ) : (
            <div className="tasks-list">
              {tasks.slice(0, 5).map(task => (
                <AITaskComponent
                  key={task.id}
                  task={task}
                  onComplete={(result) => {
                    console.log('任务完成:', result);
                    notificationManager.add({
                      type: NotificationType.SUCCESS,
                      priority: NotificationPriority.NORMAL,
                      title: 'AI处理完成',
                      message: `${getTaskTypeName(task.taskType)}处理成功，置信度: ${(result.confidence * 100).toFixed(1)}%`,
                      autoDismiss: true,
                      dismissDelay: 5000
                    });
                  }}
                  onError={(error) => {
                    console.error('任务失败:', error);
                    notificationManager.add({
                      type: NotificationType.ERROR,
                      priority: NotificationPriority.HIGH,
                      title: 'AI处理失败',
                      message: `${getTaskTypeName(task.taskType)}处理失败: ${error.message}`,
                      autoDismiss: false
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* AI控制面板 */}
        <div className="control-panel-section">
          <h3>AI控制面板</h3>
          <AIControlPanel />
        </div>
      </div>
    </div>
  );
});

// 辅助函数
const getTaskTypeDescription = (taskType) => {
  const descriptions = {
    [AITaskType.INTENT_RECOGNITION]: '进行意图识别',
    [AITaskType.TRANSLATION]: '翻译',
    [AITaskType.SPEECH_RECOGNITION]: '进行语音识别',
    [AITaskType.SENTIMENT_ANALYSIS]: '进行情感分析',
    [AITaskType.AUTO_REPLY]: '生成自动回复'
  };
  return descriptions[taskType] || '处理';
};

const getTaskTypeName = (taskType) => {
  const names = {
    [AITaskType.INTENT_RECOGNITION]: '意图识别',
    [AITaskType.TRANSLATION]: '翻译',
    [AITaskType.SPEECH_RECOGNITION]: '语音识别',
    [AITaskType.SENTIMENT_ANALYSIS]: '情感分析',
    [AITaskType.AUTO_REPLY]: '自动回复'
  };
  return names[taskType] || '未知任务';
};

// 默认导出
export default EnterpriseAIExample;