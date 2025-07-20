import React, { useState } from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader,
  Button,
  Input,
  ScrollShadow,
  Tabs,
  Tab,
  Chip,
  Tooltip
} from '@heroui/react';
import { Icon } from '@iconify/react';
import clsx from 'clsx';

/**
 * QuickReplyPanel - 快捷回复面板组件
 * @param {Object} props
 * @param {Array} props.categories - 回复分类
 * @param {Function} props.onSelectReply - 选择回复的回调函数
 * @param {boolean} props.isCollapsed - 是否折叠状态
 */
const QuickReplyPanel = ({ 
  categories = [], 
  onSelectReply,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 默认快捷回复数据
  const defaultCategories = [
    {
      id: 'greetings',
      name: '问候语',
      icon: 'ph:hand-waving',
      replies: [
        { id: 1, text: '您好！欢迎咨询，我是专业客服，很高兴为您服务。', shortcut: 'hi' },
        { id: 2, text: '感谢您的咨询，请问有什么可以帮助您的吗？', shortcut: 'help' },
        { id: 3, text: '您好！我是客服小助手，请问需要什么帮助呢？', shortcut: 'hello' }
      ]
    },
    {
      id: 'common',
      name: '常用回复',
      icon: 'ph:chat-circle-text',
      replies: [
        { id: 4, text: '好的，我马上为您查询。', shortcut: 'check' },
        { id: 5, text: '请稍等，正在为您处理...', shortcut: 'wait' },
        { id: 6, text: '非常抱歉给您带来不便，我们会尽快解决。', shortcut: 'sorry' },
        { id: 7, text: '感谢您的理解和支持！', shortcut: 'thanks' }
      ]
    },
    {
      id: 'order',
      name: '订单相关',
      icon: 'ph:package',
      replies: [
        { id: 8, text: '您的订单正在处理中，预计1-3个工作日内发货。', shortcut: 'ship' },
        { id: 9, text: '请提供您的订单号，我来帮您查询。', shortcut: 'orderid' },
        { id: 10, text: '退款将在3-5个工作日内原路返回。', shortcut: 'refund' }
      ]
    },
    {
      id: 'closing',
      name: '结束语',
      icon: 'ph:sign-out',
      replies: [
        { id: 11, text: '感谢您的咨询，祝您生活愉快！', shortcut: 'bye' },
        { id: 12, text: '问题已解决，如有其他问题欢迎随时咨询。', shortcut: 'solved' },
        { id: 13, text: '很高兴为您服务，再见！', shortcut: 'goodbye' }
      ]
    }
  ];

  const data = categories.length > 0 ? categories : defaultCategories;

  // 获取所有回复
  const getAllReplies = () => {
    return data.flatMap(cat => cat.replies || []);
  };

  // 根据搜索和分类过滤回复
  const getFilteredReplies = () => {
    let replies = selectedCategory === 'all' 
      ? getAllReplies()
      : data.find(cat => cat.id === selectedCategory)?.replies || [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      replies = replies.filter(reply => 
        reply.text.toLowerCase().includes(query) ||
        reply.shortcut?.toLowerCase().includes(query)
      );
    }

    return replies;
  };

  const handleReplyClick = (reply) => {
    onSelectReply?.(reply.text);
  };

  if (isCollapsed) {
    return (
      <div className="relative">
        <Tooltip content="展开快捷回复" placement="left">
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            onClick={onToggleCollapse}
            className="absolute right-0 top-0"
          >
            <Icon icon="ph:chat-text" className="w-5 h-5" />
          </Button>
        </Tooltip>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Icon icon="ph:lightning" className="w-5 h-5 text-warning" />
          <h3 className="text-sm font-semibold">快捷回复</h3>
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onClick={onToggleCollapse}
        >
          <Icon icon="ph:x" className="w-4 h-4" />
        </Button>
      </CardHeader>
      
      <CardBody className="pt-2">
        <Input
          size="sm"
          placeholder="搜索快捷回复..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          startContent={<Icon icon="ph:magnifying-glass" className="w-4 h-4" />}
          className="mb-3"
        />
        
        <Tabs
          size="sm"
          selectedKey={selectedCategory}
          onSelectionChange={setSelectedCategory}
          className="mb-3"
        >
          <Tab key="all" title="全部" />
          {data.map(cat => (
            <Tab 
              key={cat.id} 
              title={
                <div className="flex items-center gap-1">
                  <Icon icon={cat.icon} className="w-4 h-4" />
                  <span>{cat.name}</span>
                </div>
              }
            />
          ))}
        </Tabs>
        
        <ScrollShadow className="h-64">
          <div className="space-y-2">
            {getFilteredReplies().map(reply => (
              <Card
                key={reply.id}
                isPressable
                className="cursor-pointer hover:scale-[1.02] transition-transform"
                onClick={() => handleReplyClick(reply)}
              >
                <CardBody className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1">{reply.text}</p>
                    {reply.shortcut && (
                      <Chip size="sm" variant="flat" color="primary">
                        /{reply.shortcut}
                      </Chip>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
            
            {getFilteredReplies().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Icon icon="ph:magnifying-glass-minus" className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">没有找到匹配的快捷回复</p>
              </div>
            )}
          </div>
        </ScrollShadow>
      </CardBody>
    </Card>
  );
};

export default QuickReplyPanel;