import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerList } from '../components/CustomerList';

const mockCustomers = [
  {
    id: '1',
    name: '张三',
    status: 'online',
    avatar: 'avatar1.jpg',
    timestamp: new Date(),
    lastMessage: '你好',
    unreadCount: 2
  },
  {
    id: '2',
    name: '李四',
    status: 'offline',
    avatar: 'avatar2.jpg',
    timestamp: new Date(),
    lastMessage: '再见',
    unreadCount: 0
  }
];

describe('CustomerList', () => {
  it('renders customer list correctly', () => {
    const mockOnSelect = jest.fn();
    render(<CustomerList customers={mockCustomers} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
  });

  it('calls onSelect when customer is clicked', () => {
    const mockOnSelect = jest.fn();
    render(<CustomerList customers={mockCustomers} onSelect={mockOnSelect} />);
    
    fireEvent.click(screen.getByText('张三'));
    expect(mockOnSelect).toHaveBeenCalledWith(mockCustomers[0]);
  });

  it('shows unread count badge', () => {
    const mockOnSelect = jest.fn();
    render(<CustomerList customers={mockCustomers} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
