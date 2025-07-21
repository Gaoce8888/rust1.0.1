import React from 'react';
import { Avatar, Badge, Chip } from '@heroui/react';
import { Icon } from '@iconify/react';

export const CustomerList = React.memo(({ customers, currentCustomer, onSelect }) => {
  return (
    <div className="space-y-2">
      {customers.map((customer) => (
        <div
          key={customer.id}
          className={`p-3 rounded-lg cursor-pointer transition-colors ${
            currentCustomer?.id === customer.id
              ? 'bg-primary/10 border border-primary/20'
              : 'hover:bg-default-100'
          }`}
          onClick={() => onSelect(customer)}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                size="sm"
                src={customer.avatar}
                name={customer.name}
              />
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                customer.status === 'online' ? 'bg-success' : 'bg-default-300'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-small font-medium truncate">{customer.name}</p>
                <span className="text-tiny text-default-400">
                  {new Date(customer.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-tiny text-default-500 truncate">
                {customer.lastMessage || '暂无消息'}
              </p>
            </div>
            {customer.unreadCount > 0 && (
              <Badge content={customer.unreadCount} color="primary" size="sm" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

CustomerList.displayName = 'CustomerList';
