import React from 'react';
import { Card, CardBody, CardHeader, Progress, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import clsx from 'clsx';

/**
 * ChatStatistics - 聊天统计组件
 * @param {Object} props
 * @param {Object} props.stats - 统计数据
 */
const ChatStatistics = ({ 
  stats = {},
  className = ''
}) => {
  // 默认统计数据
  const defaultStats = {
    totalConversations: stats.totalConversations || 0,
    activeConversations: stats.activeConversations || 0,
    totalMessages: stats.totalMessages || 0,
    avgResponseTime: stats.avgResponseTime || '0分钟',
    satisfaction: stats.satisfaction || 0,
    todayConversations: stats.todayConversations || 0,
    resolvedToday: stats.resolvedToday || 0,
    pendingConversations: stats.pendingConversations || 0
  };

  const statCards = [
    {
      icon: 'ph:chat-circle-text',
      label: '总对话数',
      value: defaultStats.totalConversations,
      color: 'primary',
      trend: '+12%',
      trendUp: true
    },
    {
      icon: 'ph:users',
      label: '活跃对话',
      value: defaultStats.activeConversations,
      color: 'success',
      subValue: defaultStats.pendingConversations + ' 待处理'
    },
    {
      icon: 'ph:clock',
      label: '平均响应时间',
      value: defaultStats.avgResponseTime,
      color: 'warning',
      trend: '-15%',
      trendUp: false
    },
    {
      icon: 'ph:smiley',
      label: '满意度',
      value: defaultStats.satisfaction + '%',
      color: 'danger',
      progress: defaultStats.satisfaction
    }
  ];

  const getColorClass = (color) => {
    const colors = {
      primary: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-danger'
    };
    return colors[color] || 'text-gray-500';
  };

  const getBgColorClass = (color) => {
    const colors = {
      primary: 'bg-primary-50 dark:bg-primary-900/20',
      success: 'bg-success-50 dark:bg-success-900/20',
      warning: 'bg-warning-50 dark:bg-warning-900/20',
      danger: 'bg-danger-50 dark:bg-danger-900/20'
    };
    return colors[color] || 'bg-gray-50';
  };

  return (
    <div className={clsx("space-y-4", className)}>
      {/* 统计卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardBody className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={clsx(
                  "p-2 rounded-lg",
                  getBgColorClass(stat.color)
                )}>
                  <Icon 
                    icon={stat.icon} 
                    className={clsx(
                      "w-6 h-6",
                      getColorClass(stat.color)
                    )}
                  />
                </div>
                {stat.trend && (
                  <div className={clsx(
                    "flex items-center gap-1 text-xs",
                    stat.trendUp ? "text-success" : "text-danger"
                  )}>
                    <Icon 
                      icon={stat.trendUp ? "ph:arrow-up" : "ph:arrow-down"} 
                      className="w-3 h-3"
                    />
                    <span>{stat.trend}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
                {stat.subValue && (
                  <p className="text-xs text-gray-400">{stat.subValue}</p>
                )}
              </div>
              
              {stat.progress !== undefined && (
                <Progress 
                  value={stat.progress} 
                  size="sm"
                  color={stat.color}
                  className="mt-3"
                />
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* 今日概览 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Icon icon="ph:calendar" className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">今日概览</h3>
            </div>
            <Chip size="sm" variant="flat" color="primary">
              {new Date().toLocaleDateString('zh-CN')}
            </Chip>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <Icon icon="ph:chat-circle" className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{defaultStats.todayConversations}</p>
              <p className="text-sm text-gray-500">今日对话</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <Icon icon="ph:check-circle" className="w-8 h-8 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold">{defaultStats.resolvedToday}</p>
              <p className="text-sm text-gray-500">已解决</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <Icon icon="ph:hourglass" className="w-8 h-8 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold">
                {((defaultStats.resolvedToday / defaultStats.todayConversations) * 100 || 0).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">解决率</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default ChatStatistics;