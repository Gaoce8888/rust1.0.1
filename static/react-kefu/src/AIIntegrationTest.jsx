import React, { useState, useEffect } from 'react';
import { 
  EnterpriseKefuAppWithNotifications,
  EnterpriseAIExample,
  useAI,
  aiManager,
  AITaskType,
  notificationManager,
  NotificationType,
  NotificationPriority
} from './components';

// AI集成测试组件
export const AIIntegrationTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const { tasks, statistics, submitTask } = useAI();

  // 添加测试结果
  const addTestResult = (test, status, message, details = null) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      message,
      details,
      timestamp: new Date()
    }]);
  };

  // 测试AI管理器初始化
  const testAIManagerInitialization = () => {
    try {
      if (aiManager) {
        addTestResult('AI管理器初始化', 'PASS', 'AI管理器已成功初始化');
        return true;
      } else {
        addTestResult('AI管理器初始化', 'FAIL', 'AI管理器未初始化');
        return false;
      }
    } catch (error) {
      addTestResult('AI管理器初始化', 'ERROR', `初始化失败: ${error.message}`);
      return false;
    }
  };

  // 测试通知系统集成
  const testNotificationIntegration = () => {
    try {
      notificationManager.add({
        type: NotificationType.INFO,
        priority: NotificationPriority.NORMAL,
        title: 'AI测试通知',
        message: 'AI通知系统集成测试',
        autoDismiss: true,
        dismissDelay: 3000
      });
      addTestResult('通知系统集成', 'PASS', 'AI通知已发送');
      return true;
    } catch (error) {
      addTestResult('通知系统集成', 'ERROR', `通知发送失败: ${error.message}`);
      return false;
    }
  };

  // 测试AI任务提交
  const testAITaskSubmission = async () => {
    try {
      const taskId = await submitTask(AITaskType.INTENT_RECOGNITION, {
        text: '我要投诉这个产品的质量问题'
      }, 2);
      
      addTestResult('AI任务提交', 'PASS', `任务提交成功，ID: ${taskId}`);
      return true;
    } catch (error) {
      addTestResult('AI任务提交', 'ERROR', `任务提交失败: ${error.message}`);
      return false;
    }
  };

  // 测试WebSocket AI消息处理
  const testWebSocketAIMessages = () => {
    try {
      // 模拟AI相关的WebSocket消息
      const aiMessages = [
        {
          type: 'AITaskSubmitted',
          task_id: 'test_task_1',
          task_type: 'IntentRecognition',
          user_id: 'test_user'
        },
        {
          type: 'AITaskCompleted',
          task_id: 'test_task_1',
          task_type: 'IntentRecognition',
          user_id: 'test_user',
          result: { intent: 'complaint', confidence: 0.95 }
        }
      ];

      aiMessages.forEach(message => {
        notificationManager.handleBackendMessage(message);
      });

      addTestResult('WebSocket AI消息处理', 'PASS', 'AI消息处理正常');
      return true;
    } catch (error) {
      addTestResult('WebSocket AI消息处理', 'ERROR', `消息处理失败: ${error.message}`);
      return false;
    }
  };

  // 运行所有测试
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // 测试1: AI管理器初始化
    const test1 = testAIManagerInitialization();
    
    // 测试2: 通知系统集成
    const test2 = testNotificationIntegration();
    
    // 测试3: AI任务提交
    const test3 = await testAITaskSubmission();
    
    // 测试4: WebSocket AI消息处理
    const test4 = testWebSocketAIMessages();

    // 等待一段时间让任务处理
    setTimeout(() => {
      const passedTests = [test1, test2, test3, test4].filter(Boolean).length;
      const totalTests = 4;
      
      addTestResult('测试总结', 
        passedTests === totalTests ? 'PASS' : 'FAIL',
        `测试完成: ${passedTests}/${totalTests} 通过`
      );
      
      setIsRunning(false);
    }, 2000);
  };

  return (
    <div className="ai-integration-test">
      <div className="test-header">
        <h2>🤖 AI集成测试</h2>
        <p>验证AI功能与通知系统、WebSocket的集成情况</p>
      </div>

      <div className="test-controls">
        <button 
          onClick={runAllTests} 
          disabled={isRunning}
          className="test-button"
        >
          {isRunning ? '测试中...' : '运行集成测试'}
        </button>
        
        <button 
          onClick={() => setTestResults([])}
          className="clear-button"
        >
          清空结果
        </button>
      </div>

      <div className="test-results">
        <h3>测试结果</h3>
        {testResults.length === 0 ? (
          <p className="no-results">暂无测试结果</p>
        ) : (
          <div className="results-list">
            {testResults.map(result => (
              <div key={result.id} className={`test-result ${result.status.toLowerCase()}`}>
                <div className="result-header">
                  <span className="test-name">{result.test}</span>
                  <span className={`status ${result.status.toLowerCase()}`}>
                    {result.status}
                  </span>
                </div>
                <div className="result-message">{result.message}</div>
                {result.details && (
                  <div className="result-details">
                    <pre>{JSON.stringify(result.details, null, 2)}</pre>
                  </div>
                )}
                <div className="result-timestamp">
                  {result.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ai-status">
        <h3>AI系统状态</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="label">活跃任务:</span>
            <span className="value">{tasks.filter(t => t.status === 'Processing').length}</span>
          </div>
          <div className="status-item">
            <span className="label">已完成:</span>
            <span className="value">{tasks.filter(t => t.status === 'Completed').length}</span>
          </div>
          <div className="status-item">
            <span className="label">失败任务:</span>
            <span className="value">{tasks.filter(t => t.status === 'Failed').length}</span>
          </div>
          <div className="status-item">
            <span className="label">总任务数:</span>
            <span className="value">{tasks.length}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ai-integration-test {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .test-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .test-header h2 {
          color: #333;
          margin-bottom: 10px;
        }

        .test-controls {
          display: flex;
          gap: 15px;
          margin-bottom: 30px;
          justify-content: center;
        }

        .test-button, .clear-button {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .test-button {
          background: #3b82f6;
          color: white;
        }

        .test-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .test-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .clear-button {
          background: #6b7280;
          color: white;
        }

        .clear-button:hover {
          background: #4b5563;
        }

        .test-results {
          margin-bottom: 30px;
        }

        .test-results h3 {
          color: #333;
          margin-bottom: 15px;
        }

        .no-results {
          color: #6b7280;
          text-align: center;
          font-style: italic;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .test-result {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          background: white;
        }

        .test-result.pass {
          border-left: 4px solid #10b981;
        }

        .test-result.fail {
          border-left: 4px solid #ef4444;
        }

        .test-result.error {
          border-left: 4px solid #f59e0b;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .test-name {
          font-weight: 600;
          color: #333;
        }

        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status.pass {
          background: #d1fae5;
          color: #065f46;
        }

        .status.fail {
          background: #fee2e2;
          color: #991b1b;
        }

        .status.error {
          background: #fef3c7;
          color: #92400e;
        }

        .result-message {
          color: #4b5563;
          margin-bottom: 10px;
        }

        .result-details {
          background: #f9fafb;
          border-radius: 4px;
          padding: 10px;
          margin-bottom: 10px;
        }

        .result-details pre {
          margin: 0;
          font-size: 12px;
          color: #374151;
        }

        .result-timestamp {
          font-size: 12px;
          color: #9ca3af;
        }

        .ai-status {
          background: #f9fafb;
          border-radius: 8px;
          padding: 20px;
        }

        .ai-status h3 {
          color: #333;
          margin-bottom: 15px;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .status-item .label {
          color: #6b7280;
          font-weight: 500;
        }

        .status-item .value {
          color: #333;
          font-weight: 600;
          font-size: 18px;
        }
      `}</style>
    </div>
  );
};

export default AIIntegrationTest;