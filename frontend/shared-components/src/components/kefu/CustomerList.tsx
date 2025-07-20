import React, { useState, useMemo } from 'react';
import { cn, formatRelativeTime } from '../../utils';
import { User, MessageData } from '../../types';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  MessageCircle, 
  Phone, 
  Video,
  Star,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface CustomerListProps {
  customers: User[];
  currentCustomerId?: string;
  onCustomerSelect: (customer: User) => void;
  onSendMessage?: (customerId: string) => void;
  onCall?: (customerId: string, type: 'voice' | 'video') => void;
  onTransfer?: (customerId: string) => void;
  onClose?: (customerId: string) => void;
  loading?: boolean;
  className?: string;
}

interface CustomerWithStats extends User {
  unreadCount: number;
  lastMessage?: MessageData;
  priority: 'high' | 'medium' | 'low';
  status: 'waiting' | 'active' | 'resolved' | 'closed';
  waitTime: number;
}

const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  currentCustomerId,
  onCustomerSelect,
  onSendMessage,
  onCall,
  onTransfer,
  onClose,
  loading = false,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'time' | 'priority' | 'name'>('time');

  // 模拟客户统计数据
  const customersWithStats: CustomerWithStats[] = useMemo(() => {
    return customers.map(customer => ({
      ...customer,
      unreadCount: Math.floor(Math.random() * 10),
      lastMessage: {
        message_id: '1',
        sender_id: customer.id,
        recipient_id: 'agent',
        message_type: 'text',
        content: '这是最后一条消息内容...',
        timestamp: Date.now() - Math.random() * 86400000,
        status: 'read'
      },
      priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any,
      status: ['waiting', 'active', 'resolved', 'closed'][Math.floor(Math.random() * 4)] as any,
      waitTime: Math.floor(Math.random() * 3600) // 等待时间（秒）
    }));
  }, [customers]);

  // 过滤和排序客户
  const filteredCustomers = useMemo(() => {
    let filtered = customersWithStats.filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || customer.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'time':
          return (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0);
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [customersWithStats, searchTerm, statusFilter, priorityFilter, sortBy]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'resolved':
        return <Star className="h-4 w-4 text-blue-500" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分钟`;
  };

  return (
    <div className={cn('flex flex-col h-full bg-white border-r border-gray-200', className)}>
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">客户列表</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {filteredCustomers.length} / {customers.length}
            </span>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索客户..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="pl-10"
          />
        </div>

        {/* 过滤器 */}
        <div className="flex space-x-2 mb-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部状态</option>
            <option value="waiting">等待中</option>
            <option value="active">进行中</option>
            <option value="resolved">已解决</option>
            <option value="closed">已关闭</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部优先级</option>
            <option value="high">高优先级</option>
            <option value="medium">中优先级</option>
            <option value="low">低优先级</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="time">按时间排序</option>
            <option value="priority">按优先级排序</option>
            <option value="name">按姓名排序</option>
          </select>
        </div>
      </div>

      {/* 客户列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MessageCircle className="h-12 w-12 mb-2" />
            <p>暂无客户</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className={cn(
                  'p-4 hover:bg-gray-50 cursor-pointer transition-colors',
                  currentCustomerId === customer.id && 'bg-blue-50 border-r-2 border-blue-500'
                )}
                onClick={() => onCustomerSelect(customer)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* 客户信息 */}
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {customer.name}
                          </h3>
                          {getStatusIcon(customer.status)}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          ID: {customer.id}
                        </p>
                      </div>
                    </div>

                    {/* 优先级标签 */}
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                        getPriorityColor(customer.priority)
                      )}>
                        {customer.priority === 'high' ? '高优先级' : 
                         customer.priority === 'medium' ? '中优先级' : '低优先级'}
                      </span>
                      
                      {customer.unreadCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {customer.unreadCount} 条未读
                        </span>
                      )}
                    </div>

                    {/* 最后消息 */}
                    {customer.lastMessage && (
                      <div className="text-xs text-gray-500 truncate">
                        {customer.lastMessage.content}
                      </div>
                    )}

                    {/* 等待时间 */}
                    {customer.status === 'waiting' && (
                      <div className="text-xs text-orange-600 mt-1">
                        等待时间: {formatWaitTime(customer.waitTime)}
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center space-x-1 ml-2">
                    {onSendMessage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendMessage(customer.id);
                        }}
                        className="p-1 h-6 w-6"
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {onCall && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCall(customer.id, 'voice');
                          }}
                          className="p-1 h-6 w-6"
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCall(customer.id, 'video');
                          }}
                          className="p-1 h-6 w-6"
                        >
                          <Video className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerList;