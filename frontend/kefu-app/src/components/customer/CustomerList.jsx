import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { List, Avatar, Badge, Input, Select, Tag, Spin, Empty, Button, Tooltip } from 'antd';
import { FixedSizeList } from 'react-window';
import {
  UserOutlined,
  SearchOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useCustomerStore } from '../../stores/customerStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { debounce } from 'lodash-es';

const { Search } = Input;
const { Option } = Select;

// 客户状态枚举
const CustomerStatus = {
  WAITING: 'waiting',
  CHATTING: 'chatting',
  OFFLINE: 'offline',
  RESOLVED: 'resolved'
};

// 状态配置
const statusConfig = {
  [CustomerStatus.WAITING]: {
    color: 'orange',
    text: '等待中',
    icon: <ClockCircleOutlined />
  },
  [CustomerStatus.CHATTING]: {
    color: 'green',
    text: '对话中',
    icon: <MessageOutlined />
  },
  [CustomerStatus.OFFLINE]: {
    color: 'default',
    text: '离线',
    icon: <ExclamationCircleOutlined />
  },
  [CustomerStatus.RESOLVED]: {
    color: 'blue',
    text: '已解决',
    icon: <CheckCircleOutlined />
  }
};

// 客户列表组件
const CustomerList = ({
  onSelectCustomer,
  selectedCustomerId,
  className = ''
}) => {
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('updateTime');
  
  const {
    customers,
    loading,
    loadCustomers,
    updateCustomerStatus,
    getUnreadCount
  } = useCustomerStore();

  const { subscribe } = useWebSocket();

  // 加载客户列表
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // 订阅实时更新
  useEffect(() => {
    // 订阅客户状态更新
    const unsubscribeStatus = subscribe('onlineStatus', (data) => {
      updateCustomerStatus(data.customerId, {
        status: data.online ? CustomerStatus.WAITING : CustomerStatus.OFFLINE,
        lastActiveTime: data.timestamp
      });
    });

    // 订阅新消息通知
    const unsubscribeMessage = subscribe('message', (data) => {
      if (data.customerId !== selectedCustomerId) {
        // 更新未读消息数
        updateCustomerStatus(data.customerId, {
          lastMessage: data.content,
          lastMessageTime: data.timestamp
        });
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeMessage();
    };
  }, [subscribe, updateCustomerStatus, selectedCustomerId]);

  // 搜索防抖
  const handleSearch = useMemo(
    () => debounce((value) => {
      setSearchText(value);
    }, 300),
    []
  );

  // 过滤和排序客户列表
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // 搜索过滤
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.phone?.includes(searchText)
      );
    }

    // 状态过滤
    if (filterStatus !== 'all') {
      filtered = filtered.filter(customer => customer.status === filterStatus);
    }

    // 排序
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'updateTime':
          return (b.lastMessageTime || 0) - (a.lastMessageTime || 0);
        case 'waitTime':
          return (a.waitStartTime || 0) - (b.waitStartTime || 0);
        case 'unread':
          return getUnreadCount(b.id) - getUnreadCount(a.id);
        default:
          return 0;
      }
    });

    return filtered;
  }, [customers, searchText, filterStatus, sortBy, getUnreadCount]);

  // 渲染客户项
  const renderCustomerItem = useCallback(({ index, style }) => {
    const customer = filteredCustomers[index];
    const unreadCount = getUnreadCount(customer.id);
    const statusInfo = statusConfig[customer.status] || statusConfig[CustomerStatus.OFFLINE];
    const isSelected = customer.id === selectedCustomerId;

    return (
      <div style={style} className="px-2">
        <div
          className={`
            flex items-center p-3 rounded-lg cursor-pointer transition-all
            ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'}
          `}
          onClick={() => onSelectCustomer(customer)}
        >
          {/* 头像和状态 */}
          <div className="relative mr-3">
            <Badge
              dot
              status={customer.status === CustomerStatus.CHATTING ? 'success' : 'default'}
              offset={[-2, 2]}
            >
              <Avatar
                src={customer.avatar}
                icon={!customer.avatar && <UserOutlined />}
                size={48}
              />
            </Badge>
          </div>

          {/* 客户信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium truncate flex items-center">
                {customer.name || '访客'}
                {customer.vip && (
                  <Tag color="gold" className="ml-2">VIP</Tag>
                )}
              </h4>
              {customer.lastMessageTime && (
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(customer.lastMessageTime, {
                    locale: zhCN,
                    addSuffix: true
                  })}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 truncate flex-1">
                {customer.lastMessage || '暂无消息'}
              </p>
              <div className="flex items-center space-x-2 ml-2">
                <Tag color={statusInfo.color} className="text-xs">
                  {statusInfo.icon} {statusInfo.text}
                </Tag>
                {unreadCount > 0 && (
                  <Badge count={unreadCount} className="ml-1" />
                )}
              </div>
            </div>

            {/* 额外信息 */}
            {customer.tags && customer.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {customer.tags.slice(0, 3).map((tag, index) => (
                  <Tag key={index} className="text-xs">
                    {tag}
                  </Tag>
                ))}
                {customer.tags.length > 3 && (
                  <Tag className="text-xs">+{customer.tags.length - 3}</Tag>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [filteredCustomers, selectedCustomerId, getUnreadCount, onSelectCustomer]);

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* 搜索和筛选栏 */}
      <div className="p-4 border-b">
        <Search
          placeholder="搜索客户姓名、邮箱或手机"
          prefix={<SearchOutlined />}
          onChange={(e) => handleSearch(e.target.value)}
          className="mb-3"
        />
        
        <div className="flex items-center justify-between">
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            className="w-32"
            size="small"
          >
            <Option value="all">全部状态</Option>
            <Option value={CustomerStatus.WAITING}>等待中</Option>
            <Option value={CustomerStatus.CHATTING}>对话中</Option>
            <Option value={CustomerStatus.OFFLINE}>离线</Option>
            <Option value={CustomerStatus.RESOLVED}>已解决</Option>
          </Select>

          <Select
            value={sortBy}
            onChange={setSortBy}
            className="w-32"
            size="small"
          >
            <Option value="updateTime">最近消息</Option>
            <Option value="waitTime">等待时长</Option>
            <Option value="unread">未读消息</Option>
          </Select>

          <Tooltip title="刷新列表">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={loadCustomers}
              loading={loading}
              size="small"
            />
          </Tooltip>
        </div>
      </div>

      {/* 客户列表 */}
      <div className="flex-1 overflow-hidden">
        {loading && filteredCustomers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Spin />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Empty
              description={searchText ? '没有找到匹配的客户' : '暂无客户'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <FixedSizeList
            height={600}
            itemCount={filteredCustomers.length}
            itemSize={100}
            width="100%"
          >
            {renderCustomerItem}
          </FixedSizeList>
        )}
      </div>

      {/* 统计信息 */}
      <div className="p-3 border-t bg-gray-50">
        <div className="flex justify-between text-xs text-gray-600">
          <span>总计: {customers.length} 位客户</span>
          <span>在线: {customers.filter(c => c.status !== CustomerStatus.OFFLINE).length} 位</span>
        </div>
      </div>
    </div>
  );
};

export default CustomerList;