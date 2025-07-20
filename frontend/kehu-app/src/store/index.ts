import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  User, 
  ChatSession, 
  Message, 
  ConnectionStatus, 
  Notification, 
  Settings,
  AppState 
} from '@/types';

interface AppStore extends AppState {
  // Actions
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  
  setCurrentSession: (session: ChatSession | null) => void;
  addSession: (session: ChatSession) => void;
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  removeSession: (sessionId: string) => void;
  
  addMessage: (sessionId: string, message: Message) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void;
  
  setConnectionStatus: (status: ConnectionStatus) => void;
  
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  reset: () => void;
}

const initialState: AppState = {
  user: null,
  currentSession: null,
  sessions: [],
  connectionStatus: {
    connected: false,
    reconnecting: false,
  },
  theme: 'light',
  notifications: [],
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        setUser: (user) => set((state) => {
          state.user = user;
        }),

        updateUser: (updates) => set((state) => {
          if (state.user) {
            Object.assign(state.user, updates);
          }
        }),

        setCurrentSession: (session) => set((state) => {
          state.currentSession = session;
        }),

        addSession: (session) => set((state) => {
          const exists = state.sessions.find(s => s.id === session.id);
          if (!exists) {
            state.sessions.unshift(session);
          }
        }),

        updateSession: (sessionId, updates) => set((state) => {
          const sessionIndex = state.sessions.findIndex(s => s.id === sessionId);
          if (sessionIndex !== -1) {
            Object.assign(state.sessions[sessionIndex], updates);
          }
          if (state.currentSession?.id === sessionId) {
            Object.assign(state.currentSession, updates);
          }
        }),

        removeSession: (sessionId) => set((state) => {
          state.sessions = state.sessions.filter(s => s.id !== sessionId);
          if (state.currentSession?.id === sessionId) {
            state.currentSession = null;
          }
        }),

        addMessage: (sessionId, message) => set((state) => {
          const session = state.sessions.find(s => s.id === sessionId);
          if (session) {
            session.messages.push(message);
            session.updatedAt = new Date().toISOString();
          }
          if (state.currentSession?.id === sessionId) {
            state.currentSession.messages.push(message);
            state.currentSession.updatedAt = new Date().toISOString();
          }
        }),

        updateMessage: (sessionId, messageId, updates) => set((state) => {
          const session = state.sessions.find(s => s.id === sessionId);
          if (session) {
            const messageIndex = session.messages.findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
              Object.assign(session.messages[messageIndex], updates);
            }
          }
          if (state.currentSession?.id === sessionId) {
            const messageIndex = state.currentSession.messages.findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
              Object.assign(state.currentSession.messages[messageIndex], updates);
            }
          }
        }),

        setConnectionStatus: (status) => set((state) => {
          state.connectionStatus = status;
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
          // Update document class for dark mode
          if (typeof document !== 'undefined') {
            if (newTheme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        }),

        addNotification: (notification) => set((state) => {
          const newNotification: Notification = {
            ...notification,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            read: false,
          };
          state.notifications.unshift(newNotification);
          // Keep only last 50 notifications
          if (state.notifications.length > 50) {
            state.notifications = state.notifications.slice(0, 50);
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

        reset: () => set(() => ({
          ...initialState,
        })),
      })),
      {
        name: 'kehu-app-store',
        partialize: (state) => ({
          user: state.user,
          theme: state.theme,
          sessions: state.sessions.slice(0, 10), // Only persist last 10 sessions
        }),
      }
    ),
    {
      name: 'kehu-app-store',
    }
  )
);

// Settings store
interface SettingsStore {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  notifications: {
    sound: true,
    desktop: true,
    email: false,
  },
  privacy: {
    showOnlineStatus: true,
    allowDirectMessages: true,
  },
  appearance: {
    theme: 'auto',
    fontSize: 'medium',
    compactMode: false,
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    immer((set) => ({
      settings: defaultSettings,

      updateSettings: (updates) => set((state) => {
        Object.assign(state.settings, updates);
      }),

      resetSettings: () => set((state) => {
        state.settings = defaultSettings;
      }),
    })),
    {
      name: 'kehu-app-settings',
    }
  )
);