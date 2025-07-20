import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// API 服务
const messageAPI = {
  // 获取消息列表
  async fetchMessages(sessionId, page = 1, pageSize = 50) {
    const response = await fetch(`/api/messages?sessionId=${sessionId}&page=${page}&pageSize=${pageSize}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  },

  // 发送消息
  async sendMessage(messageData) {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(messageData)
    });
    
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  },

  // 更新消息状态
  async updateMessageStatus(messageId, status) {
    const response = await fetch(`/api/messages/${messageId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) throw new Error('Failed to update message status');
    return response.json();
  }
};

// 创建消息Store
export const useMessageStore = create(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // 状态
        messages: {},           // { sessionId: Message[] }
        loading: {},           // { sessionId: boolean }
        hasMore: {},          // { sessionId: boolean }
        currentPage: {},      // { sessionId: number }
        typingUsers: {},      // { sessionId: { userId: timestamp } }
        unreadCount: {},      // { sessionId: number }
        
        // Actions
        // 加载消息
        loadMessages: async (sessionId) => {
          const state = get();
          if (state.loading[sessionId]) return;

          set((draft) => {
            draft.loading[sessionId] = true;
          });

          try {
            const data = await messageAPI.fetchMessages(sessionId, 1);
            
            set((draft) => {
              draft.messages[sessionId] = data.messages.reverse();
              draft.currentPage[sessionId] = 1;
              draft.hasMore[sessionId] = data.hasMore;
              draft.loading[sessionId] = false;
              draft.unreadCount[sessionId] = 0;
            });
          } catch (error) {
            console.error('Failed to load messages:', error);
            set((draft) => {
              draft.loading[sessionId] = false;
            });
          }
        },

        // 加载更多消息
        loadMoreMessages: async (sessionId) => {
          const state = get();
          if (state.loading[sessionId] || !state.hasMore[sessionId]) return;

          const currentPage = state.currentPage[sessionId] || 1;
          const nextPage = currentPage + 1;

          set((draft) => {
            draft.loading[sessionId] = true;
          });

          try {
            const data = await messageAPI.fetchMessages(sessionId, nextPage);
            
            set((draft) => {
              const existingMessages = draft.messages[sessionId] || [];
              draft.messages[sessionId] = [...data.messages.reverse(), ...existingMessages];
              draft.currentPage[sessionId] = nextPage;
              draft.hasMore[sessionId] = data.hasMore;
              draft.loading[sessionId] = false;
            });
          } catch (error) {
            console.error('Failed to load more messages:', error);
            set((draft) => {
              draft.loading[sessionId] = false;
            });
          }
        },

        // 添加消息
        addMessage: (message) => {
          set((draft) => {
            const sessionId = message.sessionId;
            if (!draft.messages[sessionId]) {
              draft.messages[sessionId] = [];
            }
            
            // 检查是否已存在
            const exists = draft.messages[sessionId].some(m => m.id === message.id);
            if (!exists) {
              draft.messages[sessionId].push(message);
              
              // 更新未读数
              if (!message.isOwn && !message.read) {
                draft.unreadCount[sessionId] = (draft.unreadCount[sessionId] || 0) + 1;
              }
            }
          });
        },

        // 批量添加消息
        addMessages: (sessionId, messages) => {
          set((draft) => {
            if (!draft.messages[sessionId]) {
              draft.messages[sessionId] = [];
            }
            
            messages.forEach(message => {
              const exists = draft.messages[sessionId].some(m => m.id === message.id);
              if (!exists) {
                draft.messages[sessionId].push(message);
              }
            });
          });
        },

        // 更新消息状态
        updateMessageStatus: (messageId, updates) => {
          set((draft) => {
            Object.values(draft.messages).forEach(sessionMessages => {
              const message = sessionMessages.find(m => m.id === messageId);
              if (message) {
                Object.assign(message, updates);
              }
            });
          });
        },

        // 标记消息已读
        markAsRead: (sessionId) => {
          set((draft) => {
            const messages = draft.messages[sessionId] || [];
            messages.forEach(message => {
              if (!message.isOwn && !message.read) {
                message.read = true;
              }
            });
            draft.unreadCount[sessionId] = 0;
          });

          // 向服务器发送已读状态
          const messages = get().messages[sessionId] || [];
          const unreadIds = messages
            .filter(m => !m.isOwn && !m.read)
            .map(m => m.id);
          
          if (unreadIds.length > 0) {
            messageAPI.updateMessageStatus(unreadIds, 'read').catch(console.error);
          }
        },

        // 设置正在输入的用户
        setTypingUser: (sessionId, userId, isTyping) => {
          set((draft) => {
            if (!draft.typingUsers[sessionId]) {
              draft.typingUsers[sessionId] = {};
            }
            
            if (isTyping) {
              draft.typingUsers[sessionId][userId] = Date.now();
            } else {
              delete draft.typingUsers[sessionId][userId];
            }
          });
        },

        // 清理过期的输入状态
        cleanupTypingUsers: () => {
          const now = Date.now();
          const timeout = 3000; // 3秒超时

          set((draft) => {
            Object.entries(draft.typingUsers).forEach(([sessionId, users]) => {
              Object.entries(users).forEach(([userId, timestamp]) => {
                if (now - timestamp > timeout) {
                  delete draft.typingUsers[sessionId][userId];
                }
              });
            });
          });
        },

        // 清除会话消息
        clearSessionMessages: (sessionId) => {
          set((draft) => {
            delete draft.messages[sessionId];
            delete draft.loading[sessionId];
            delete draft.hasMore[sessionId];
            delete draft.currentPage[sessionId];
            delete draft.typingUsers[sessionId];
            delete draft.unreadCount[sessionId];
          });
        },

        // 获取会话消息
        getSessionMessages: (sessionId) => {
          return get().messages[sessionId] || [];
        },

        // 获取未读数
        getUnreadCount: (sessionId) => {
          return get().unreadCount[sessionId] || 0;
        },

        // 获取总未读数
        getTotalUnreadCount: () => {
          const unreadCounts = get().unreadCount;
          return Object.values(unreadCounts).reduce((total, count) => total + count, 0);
        }
      }))
    ),
    {
      name: 'message-store'
    }
  )
);

// 定期清理过期的输入状态
setInterval(() => {
  useMessageStore.getState().cleanupTypingUsers();
}, 1000);