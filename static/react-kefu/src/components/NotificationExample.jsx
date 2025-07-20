import React, { useState, useEffect, useCallback } from 'react';
import {
  NotificationContainer,
  NotificationCenter,
  NotificationBadge,
  SmartReminder,
  useNotifications,
  notificationManager,
  NotificationType,
  NotificationPriority,
  NotificationPosition
} from './EnterpriseNotifications';

// 通知/提醒系统使用示例
export const NotificationExample = React.memo(() => {
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [reminders, setReminders] = useState([]);
  const { unreadCount, addNotification } = useNotifications();

  // 初始化示例提醒
  useEffect(() => {
    const exampleReminders = [
      {
        id: 'meeting-reminder',
        title: '团队会议',
        message: '下午2点有重要团队会议，请准时参加',
        triggerTime: new Date(Date.now() + 5 * 60 * 1000), // 5分钟后
        triggered: false
      },
      {
        id: 'system-check',
        title: '系统维护',
        message: '系统将在今晚10点进行维护，请提前保存工作',
        triggerTime: new Date(Date.now() + 10 * 60 * 1000), // 10分钟后
        triggered: false
      }
    ];
    setReminders(exampleReminders);
  }, []);

  // 处理提醒触发
  const handleReminderTrigger = useCallback((reminder) => {
    console.log('提醒触发:', reminder);
    
    // 根据提醒类型处理
    switch (reminder.id) {
      case 'meeting-reminder':
        // 会议提醒逻辑
        addNotification({
          type: NotificationType.ALERT,
          priority: NotificationPriority.HIGH,
          title: '会议提醒',
          message: '团队会议即将开始，请准备参加',
          autoDismiss: false,
          actions: [
            {
              label: '加入会议',
              type: 'primary',
              handler: () => {
                console.log('加入会议');
                notificationManager.remove(reminder.id);
              }
            },
            {
              label: '稍后提醒',
              type: 'secondary',
              handler: () => {
                // 设置5分钟后再次提醒
                const newReminder = {
                  ...reminder,
                  triggerTime: new Date(Date.now() + 5 * 60 * 1000),
                  triggered: false
                };
                setReminders(prev => prev.map(r => r.id === reminder.id ? newReminder : r));
                notificationManager.remove(reminder.id);
              }
            }
          ]
        });
        break;
        
      case 'system-check':
        // 系统维护提醒
        addNotification({
          type: NotificationType.WARNING,
          priority: NotificationPriority.NORMAL,
          title: '系统维护通知',
          message: '系统将在今晚10点进行维护，预计持续2小时',
          autoDismiss: true,
          dismissDelay: 8000
        });
        break;
        
      default:
        break;
    }
  }, [addNotification]);

  // 示例：发送不同类型的通知
  const sendExampleNotifications = useCallback(() => {
    // 信息通知
    addNotification({
      type: NotificationType.INFO,
      priority: NotificationPriority.NORMAL,
      title: '系统信息',
      message: '系统运行正常，所有服务状态良好',
      autoDismiss: true,
      dismissDelay: 4000
    });

    // 成功通知
    setTimeout(() => {
      addNotification({
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.NORMAL,
        title: '操作成功',
        message: '文件上传完成，共处理了15个文件',
        autoDismiss: true,
        dismissDelay: 4000
      });
    }, 1000);

    // 警告通知
    setTimeout(() => {
      addNotification({
        type: NotificationType.WARNING,
        priority: NotificationPriority.HIGH,
        title: '磁盘空间不足',
        message: '系统磁盘空间使用率达到85%，建议清理临时文件',
        autoDismiss: false,
        actions: [
          {
            label: '立即清理',
            type: 'primary',
            handler: () => {
              console.log('执行清理操作');
              notificationManager.remove('disk-warning');
            }
          },
          {
            label: '稍后处理',
            type: 'secondary',
            dismiss: true
          }
        ]
      });
    }, 2000);

    // 错误通知
    setTimeout(() => {
      addNotification({
        type: NotificationType.ERROR,
        priority: NotificationPriority.URGENT,
        title: '连接错误',
        message: '无法连接到数据库服务器，请检查网络连接',
        autoDismiss: false,
        actions: [
          {
            label: '重试连接',
            type: 'primary',
            handler: () => {
              console.log('重试数据库连接');
              notificationManager.remove('db-error');
            }
          },
          {
            label: '查看详情',
            type: 'secondary',
            handler: () => {
              console.log('查看错误详情');
            }
          }
        ]
      });
    }, 3000);

    // 聊天通知
    setTimeout(() => {
      addNotification({
        type: NotificationType.CHAT,
        priority: NotificationPriority.NORMAL,
        title: '新消息',
        message: '张三: 你好，请问产品什么时候能发货？',
        autoDismiss: true,
        dismissDelay: 5000
      });
    }, 4000);

    // 系统通知
    setTimeout(() => {
      addNotification({
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.NORMAL,
        title: '系统更新',
        message: '新版本v2.1.0已发布，包含性能优化和bug修复',
        autoDismiss: true,
        dismissDelay: 6000
      });
    }, 5000);

    // 带进度条的通知
    setTimeout(() => {
      const progressNotification = addNotification({
        type: NotificationType.INFO,
        priority: NotificationPriority.NORMAL,
        title: '数据同步',
        message: '正在同步用户数据...',
        progress: 0,
        autoDismiss: false
      });

      // 模拟进度更新
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        const notification = notificationManager.get(progressNotification);
        if (notification) {
          notification.progress = progress;
          notificationManager.emit('notificationsChanged', notificationManager.getAll());
        }
        
        if (progress >= 100) {
          clearInterval(progressInterval);
          notificationManager.remove(progressNotification);
          
          // 显示完成通知
          addNotification({
            type: NotificationType.SUCCESS,
            priority: NotificationPriority.NORMAL,
            title: '同步完成',
            message: '用户数据同步已完成',
            autoDismiss: true,
            dismissDelay: 3000
          });
        }
      }, 500);
    }, 6000);
  }, [addNotification]);

  // 清除所有通知
  const clearAllNotifications = useCallback(() => {
    notificationManager.clear();
  }, []);

  // 标记所有为已读
  const markAllAsRead = useCallback(() => {
    notificationManager.markAllAsRead();
  }, []);

  return (
    <div className="notification-example">
      <div className="example-header">
        <h1>企业级通知/提醒系统示例</h1>
        <p>演示各种通知类型和功能</p>
      </div>

      <div className="example-controls">
        <button onClick={sendExampleNotifications} className="btn-primary">
          发送示例通知
        </button>
        
        <button onClick={clearAllNotifications} className="btn-secondary">
          清除所有通知
        </button>
        
        <button onClick={markAllAsRead} className="btn-secondary">
          全部已读
        </button>
        
        <button 
          onClick={() => setIsNotificationCenterOpen(true)} 
          className="btn-primary"
        >
          打开通知中心 ({unreadCount})
        </button>
      </div>

      <div className="example-features">
        <div className="feature-card">
          <h3>通知类型</h3>
          <ul>
            <li>信息通知 (Info)</li>
            <li>成功通知 (Success)</li>
            <li>警告通知 (Warning)</li>
            <li>错误通知 (Error)</li>
            <li>聊天通知 (Chat)</li>
            <li>系统通知 (System)</li>
            <li>告警通知 (Alert)</li>
          </ul>
        </div>

        <div className="feature-card">
          <h3>通知优先级</h3>
          <ul>
            <li>低优先级 (Low)</li>
            <li>普通优先级 (Normal)</li>
            <li>高优先级 (High)</li>
            <li>紧急优先级 (Urgent)</li>
          </ul>
        </div>

        <div className="feature-card">
          <h3>功能特性</h3>
          <ul>
            <li>自动关闭</li>
            <li>手动操作</li>
            <li>进度条显示</li>
            <li>声音提醒</li>
            <li>桌面通知</li>
            <li>智能提醒</li>
            <li>通知中心</li>
          </ul>
        </div>
      </div>

      {/* 通知容器 */}
      <NotificationContainer 
        position={NotificationPosition.TOP_RIGHT}
        maxNotifications={5}
      />

      {/* 通知中心 */}
      <NotificationCenter 
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />

      {/* 智能提醒 */}
      <SmartReminder 
        reminders={reminders}
        onReminderTrigger={handleReminderTrigger}
      />

      {/* 通知徽章 */}
      <div className="notification-badge-container">
        <NotificationBadge 
          count={unreadCount}
          onClick={() => setIsNotificationCenterOpen(true)}
        />
      </div>

      <style jsx>{`
        .notification-example {
          padding: var(--spacing-lg);
          max-width: 1200px;
          margin: 0 auto;
        }

        .example-header {
          text-align: center;
          margin-bottom: var(--spacing-2xl);
        }

        .example-header h1 {
          color: var(--gray-900);
          margin-bottom: var(--spacing-sm);
        }

        .example-header p {
          color: var(--gray-600);
          font-size: var(--font-size-lg);
        }

        .example-controls {
          display: flex;
          gap: var(--spacing-md);
          justify-content: center;
          margin-bottom: var(--spacing-2xl);
          flex-wrap: wrap;
        }

        .btn-primary {
          background: var(--primary-color);
          color: white;
          border: none;
          padding: var(--spacing-sm) var(--spacing-lg);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: var(--font-size-sm);
          transition: var(--transition-fast);
        }

        .btn-primary:hover {
          background: var(--primary-dark);
        }

        .btn-secondary {
          background: var(--gray-200);
          color: var(--gray-700);
          border: none;
          padding: var(--spacing-sm) var(--spacing-lg);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: var(--font-size-sm);
          transition: var(--transition-fast);
        }

        .btn-secondary:hover {
          background: var(--gray-300);
        }

        .example-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--spacing-lg);
        }

        .feature-card {
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--gray-200);
        }

        .feature-card h3 {
          color: var(--gray-900);
          margin-bottom: var(--spacing-md);
          font-size: var(--font-size-lg);
        }

        .feature-card ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .feature-card li {
          padding: var(--spacing-xs) 0;
          color: var(--gray-600);
          border-bottom: 1px solid var(--gray-100);
        }

        .feature-card li:last-child {
          border-bottom: none;
        }

        @media (max-width: 768px) {
          .notification-example {
            padding: var(--spacing-md);
          }

          .example-controls {
            flex-direction: column;
            align-items: center;
          }

          .example-features {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
});

export default NotificationExample;