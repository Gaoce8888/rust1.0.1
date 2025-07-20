import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store';
import { wsService } from '@/services/websocket';
import { 
  getSessions, 
  getSession, 
  sendMessage as apiSendMessage,
  createSession,
  closeSession 
} from '@/services/api';
import { Message, ChatSession } from '@/types';
import { toast } from 'react-hot-toast';

export function useChat() {
  const {
    currentSession,
    sessions,
    setCurrentSession,
    addSession,
    addMessage,
    updateMessage,
    connectionStatus,
  } = useAppStore();

  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => getSessions(),
    staleTime: 30000,
  });

  // Fetch current session details
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', currentSession?.id],
    queryFn: () => currentSession ? getSession(currentSession.id) : null,
    enabled: !!currentSession?.id,
    staleTime: 10000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, type = 'text' }: { content: string; type?: 'text' | 'image' | 'file' }) => {
      if (!currentSession) throw new Error('No active session');
      
      // Create optimistic message
      const optimisticMessage: Message = {
        id: Date.now().toString(),
        content,
        type,
        sender: useAppStore.getState().user!,
        timestamp: new Date().toISOString(),
        status: 'sending',
      };

      // Add optimistic message immediately
      addMessage(currentSession.id, optimisticMessage);

      try {
        // Send via WebSocket if connected
        if (connectionStatus.connected) {
          wsService.sendMessage(currentSession.id, content, type);
        } else {
          // Fallback to HTTP API
          await apiSendMessage(currentSession.id, content, type);
        }

        // Update message status
        updateMessage(currentSession.id, optimisticMessage.id, { status: 'sent' });
      } catch (error) {
        // Update message status to failed
        updateMessage(currentSession.id, optimisticMessage.id, { status: 'failed' });
        throw error;
      }
    },
    onError: (error) => {
      toast.error('发送消息失败: ' + error.message);
    },
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (session) => {
      addSession(session);
      setCurrentSession(session);
      wsService.joinSession(session.id);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('新会话已创建');
    },
    onError: (error) => {
      toast.error('创建会话失败: ' + error.message);
    },
  });

  // Close session mutation
  const closeSessionMutation = useMutation({
    mutationFn: closeSession,
    onSuccess: () => {
      if (currentSession) {
        wsService.leaveSession(currentSession.id);
        setCurrentSession(null);
      }
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('会话已关闭');
    },
    onError: (error) => {
      toast.error('关闭会话失败: ' + error.message);
    },
  });

  // Send message function
  const sendMessage = useCallback((content: string, type: 'text' | 'image' | 'file' = 'text') => {
    if (!content.trim()) return;
    sendMessageMutation.mutate({ content, type });
  }, [sendMessageMutation]);

  // Join session function
  const joinSession = useCallback((session: ChatSession) => {
    if (currentSession?.id === session.id) return;
    
    // Leave current session
    if (currentSession) {
      wsService.leaveSession(currentSession.id);
    }
    
    // Join new session
    setCurrentSession(session);
    wsService.joinSession(session.id);
  }, [currentSession, setCurrentSession]);

  // Create new session function
  const startNewSession = useCallback((data?: { subject?: string; department?: string; priority?: string }) => {
    createSessionMutation.mutate(data || {});
  }, [createSessionMutation]);

  // Close current session function
  const endCurrentSession = useCallback(() => {
    if (!currentSession) return;
    closeSessionMutation.mutate(currentSession.id);
  }, [currentSession, closeSessionMutation]);

  // Typing indicators
  const startTyping = useCallback(() => {
    if (!currentSession || isTyping) return;
    
    setIsTyping(true);
    wsService.sendTyping(currentSession.id, true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      wsService.sendTyping(currentSession.id, false);
    }, 3000);
  }, [currentSession, isTyping]);

  const stopTyping = useCallback(() => {
    if (!currentSession || !isTyping) return;
    
    setIsTyping(false);
    wsService.sendTyping(currentSession.id, false);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [currentSession, isTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Update sessions from query data
  useEffect(() => {
    if (sessionsData?.sessions) {
      // Update sessions in store (this could be optimized)
      sessionsData.sessions.forEach(session => {
        const existingSession = sessions.find(s => s.id === session.id);
        if (!existingSession) {
          addSession(session);
        }
      });
    }
  }, [sessionsData, sessions, addSession]);

  return {
    // State
    currentSession,
    sessions,
    connectionStatus,
    isTyping,
    
    // Loading states
    sessionsLoading,
    sessionLoading,
    isSending: sendMessageMutation.isPending,
    isCreatingSession: createSessionMutation.isPending,
    isClosingSession: closeSessionMutation.isPending,
    
    // Functions
    sendMessage,
    joinSession,
    startNewSession,
    endCurrentSession,
    startTyping,
    stopTyping,
    
    // Data
    sessionsData,
    sessionData,
  };
}