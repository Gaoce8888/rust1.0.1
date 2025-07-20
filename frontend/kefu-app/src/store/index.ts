import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  Agent, 
  AgentChatSession, 
  AgentWorkspace,
  QueueStatus,
  RealtimeMetrics,
  AgentNotification,
  QuickReply,
  KnowledgeArticle,
  AgentSettings,
  SystemConfig
} from '@/types';

interface AgentAppStore {
  // 客服状态
  agent: Agent | null;
  isOnline: boolean;
  currentStatus: 'online' | 'away' | 'busy' | 'offline';
  
  // 会话管理
  activeSessions: AgentChatSession[];
  pendingSessions: AgentChatSession[];
  selectedSessionId: string | null;
  maxConcurrentSessions: number;
  
  // 队列和指标
  queueStatus: QueueStatus | null;
  realtimeMetrics: RealtimeMetrics | null;
  
  // 工作台数据
  notifications: AgentNotification[];
  quickReplies: QuickReply[];
  knowledgeBase: KnowledgeArticle[];
  
  // 设置
  settings: AgentSettings | null;
  systemConfig: SystemConfig | null;
  
  // UI状态
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  
  // Actions
  setAgent: (agent: Agent | null) => void;
  updateAgent: (updates: Partial<Agent>) => void;
  setStatus: (status: 'online' | 'away' | 'busy' | 'offline') => void;
  
  // 会话操作
  addActiveSession: (session: AgentChatSession) => void;
  removeActiveSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<AgentChatSession>) => void;
  selectSession: (sessionId: string | null) => void;
  
  // 队列操作
  acceptSession: (sessionId: string) => void;
  transferSession: (sessionId: string, targetAgent?: string, department?: string) => void;
  closeSession: (sessionId: string, reason?: string) => void;
  
  // 数据更新
  setQueueStatus: (status: QueueStatus) => void;
  setRealtimeMetrics: (metrics: RealtimeMetrics) => void;
  
  // 通知管理
  addNotification: (notification: Omit<AgentNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // 快捷回复和知识库
  setQuickReplies: (replies: QuickReply[]) => void;
  addQuickReply: (reply: QuickReply) => void;
  updateQuickReply: (id: string, updates: Partial<QuickReply>) => void;
  deleteQuickReply: (id: string) => void;
  
  setKnowledgeBase: (articles: KnowledgeArticle[]) => void;
  
  // 设置管理
  setSettings: (settings: AgentSettings) => void;
  updateSettings: (updates: Partial<AgentSettings>) => void;
  setSystemConfig: (config: SystemConfig) => void;
  
  // UI控制
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  
  // 重置
  reset: () => void;
}

const initialState = {
  agent: null,
  isOnline: false,
  currentStatus: 'offline' as const,
  activeSessions: [],
  pendingSessions: [],
  selectedSessionId: null,
  maxConcurrentSessions: 5,
  queueStatus: null,
  realtimeMetrics: null,
  notifications: [],
  quickReplies: [],
  knowledgeBase: [],
  settings: null,
  systemConfig: null,
  sidebarCollapsed: false,
  theme: 'light' as const,
};

export const useAgentStore = create<AgentAppStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        setAgent: (agent) => set((state) => {
          state.agent = agent;
          if (agent) {
            state.maxConcurrentSessions = agent.maxConcurrentSessions;
          }
        }),

        updateAgent: (updates) => set((state) => {
          if (state.agent) {
            Object.assign(state.agent, updates);
          }
        }),

        setStatus: (status) => set((state) => {
          state.currentStatus = status;
          state.isOnline = status !== 'offline';
          if (state.agent) {
            state.agent.status = status;
          }
        }),

        addActiveSession: (session) => set((state) => {
          const existingIndex = state.activeSessions.findIndex(s => s.id === session.id);
          if (existingIndex >= 0) {
            state.activeSessions[existingIndex] = session;
          } else {
            if (state.activeSessions.length < state.maxConcurrentSessions) {
              state.activeSessions.push(session);
            }
          }
          
          // Remove from pending if exists
          state.pendingSessions = state.pendingSessions.filter(s => s.id !== session.id);
        }),

        removeActiveSession: (sessionId) => set((state) => {
          state.activeSessions = state.activeSessions.filter(s => s.id !== sessionId);
          if (state.selectedSessionId === sessionId) {
            state.selectedSessionId = null;
          }
        }),

        updateSession: (sessionId, updates) => set((state) => {
          const activeIndex = state.activeSessions.findIndex(s => s.id === sessionId);
          if (activeIndex >= 0) {
            Object.assign(state.activeSessions[activeIndex], updates);
          }
          
          const pendingIndex = state.pendingSessions.findIndex(s => s.id === sessionId);
          if (pendingIndex >= 0) {
            Object.assign(state.pendingSessions[pendingIndex], updates);
          }
        }),

        selectSession: (sessionId) => set((state) => {
          state.selectedSessionId = sessionId;
        }),

        acceptSession: (sessionId) => set((state) => {
          const pendingSession = state.pendingSessions.find(s => s.id === sessionId);
          if (pendingSession && state.activeSessions.length < state.maxConcurrentSessions) {
            state.activeSessions.push(pendingSession);
            state.pendingSessions = state.pendingSessions.filter(s => s.id !== sessionId);
            state.selectedSessionId = sessionId;
          }
        }),

        transferSession: (sessionId, targetAgent, department) => set((state) => {
          const session = state.activeSessions.find(s => s.id === sessionId);
          if (session) {
            // Add transfer record
            const transferRecord = {
              id: Date.now().toString(),
              fromAgent: state.agent!,
              toAgent: targetAgent ? { id: targetAgent } as Agent : undefined,
              toDepartment: department,
              reason: 'Manual transfer',
              timestamp: new Date().toISOString(),
            };
            session.transferHistory.push(transferRecord);
            
            // Remove from active sessions
            state.activeSessions = state.activeSessions.filter(s => s.id !== sessionId);
            if (state.selectedSessionId === sessionId) {
              state.selectedSessionId = null;
            }
          }
        }),

        closeSession: (sessionId, reason) => set((state) => {
          const session = state.activeSessions.find(s => s.id === sessionId);
          if (session) {
            session.status = 'closed';
            if (reason) {
              session.internalNotes += `\nSession closed: ${reason}`;
            }
            
            // Remove from active sessions
            state.activeSessions = state.activeSessions.filter(s => s.id !== sessionId);
            if (state.selectedSessionId === sessionId) {
              state.selectedSessionId = null;
            }
          }
        }),

        setQueueStatus: (status) => set((state) => {
          state.queueStatus = status;
          // Update pending sessions from queue
          const allPendingSessions = status.departmentQueues.flatMap(dept => dept.sessions);
          state.pendingSessions = allPendingSessions;
        }),

        setRealtimeMetrics: (metrics) => set((state) => {
          state.realtimeMetrics = metrics;
        }),

        addNotification: (notification) => set((state) => {
          const newNotification: AgentNotification = {
            ...notification,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            read: false,
          };
          state.notifications.unshift(newNotification);
          
          // Keep only last 100 notifications
          if (state.notifications.length > 100) {
            state.notifications = state.notifications.slice(0, 100);
          }
        }),

        removeNotification: (id) => set((state) => {
          state.notifications = state.notifications.filter(n => n.id !== id);
        }),

        markNotificationRead: (id) => set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification) {
            notification.read = true;
          }
        }),

        clearNotifications: () => set((state) => {
          state.notifications = [];
        }),

        setQuickReplies: (replies) => set((state) => {
          state.quickReplies = replies;
        }),

        addQuickReply: (reply) => set((state) => {
          state.quickReplies.push(reply);
        }),

        updateQuickReply: (id, updates) => set((state) => {
          const index = state.quickReplies.findIndex(r => r.id === id);
          if (index >= 0) {
            Object.assign(state.quickReplies[index], updates);
          }
        }),

        deleteQuickReply: (id) => set((state) => {
          state.quickReplies = state.quickReplies.filter(r => r.id !== id);
        }),

        setKnowledgeBase: (articles) => set((state) => {
          state.knowledgeBase = articles;
        }),

        setSettings: (settings) => set((state) => {
          state.settings = settings;
          if (settings.maxConcurrentSessions) {
            state.maxConcurrentSessions = settings.maxConcurrentSessions;
          }
        }),

        updateSettings: (updates) => set((state) => {
          if (state.settings) {
            Object.assign(state.settings, updates);
            if (updates.maxConcurrentSessions) {
              state.maxConcurrentSessions = updates.maxConcurrentSessions;
            }
          }
        }),

        setSystemConfig: (config) => set((state) => {
          state.systemConfig = config;
        }),

        toggleSidebar: () => set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed;
        }),

        setSidebarCollapsed: (collapsed) => set((state) => {
          state.sidebarCollapsed = collapsed;
        }),

        setTheme: (theme) => set((state) => {
          state.theme = theme;
          // Update document class for dark mode
          if (typeof document !== 'undefined') {
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        }),

        toggleTheme: () => set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          state.theme = newTheme;
          if (typeof document !== 'undefined') {
            if (newTheme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        }),

        reset: () => set(() => ({ ...initialState })),
      })),
      {
        name: 'agent-store',
        partialize: (state) => ({
          agent: state.agent,
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          settings: state.settings,
          quickReplies: state.quickReplies.filter(r => r.isPersonal),
        }),
      }
    ),
    {
      name: 'agent-store',
    }
  )
);