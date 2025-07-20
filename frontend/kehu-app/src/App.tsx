import React, { useState, useEffect } from 'react';
import { HeroUIProvider } from '@heroui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ContactForm } from '@/components/ContactForm';
import { ChatInterface } from '@/components/ChatInterface';
import { useAppStore } from '@/store';
import { useChat } from '@/hooks/useChat';
import { Button, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import clsx from 'clsx';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 3,
    },
  },
});

function AppContent() {
  const { theme, user, currentSession } = useAppStore();
  const { startNewSession, isCreatingSession } = useChat();
  const [showContactForm, setShowContactForm] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize app
  useEffect(() => {
    // Apply theme class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Set initialized after a short delay to show loading state
    const timer = setTimeout(() => setIsInitialized(true), 1000);
    return () => clearTimeout(timer);
  }, [theme]);

  const handleContactFormSuccess = (sessionId: string) => {
    setShowContactForm(false);
    // The session should automatically be set by the backend response
  };

  const handleStartChat = () => {
    if (currentSession) {
      // If there's already an active session, just show it
      return;
    }
    setShowContactForm(true);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner size="lg" color="primary" />
          <p className="text-gray-600 dark:text-gray-400">正在初始化应用...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-full"
        >
          <AnimatePresence mode="wait">
            {currentSession ? (
              <motion.div
                key="chat"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full max-w-4xl mx-auto"
              >
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl h-full overflow-hidden">
                  <ChatInterface className="h-full" />
                </div>
              </motion.div>
            ) : showContactForm ? (
              <motion.div
                key="contact-form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex items-center justify-center"
              >
                <ContactForm
                  onSuccess={handleContactFormSuccess}
                  onCancel={() => setShowContactForm(false)}
                  className="w-full max-w-2xl"
                />
              </motion.div>
            ) : (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex items-center justify-center"
              >
                <WelcomeScreen onStartChat={handleStartChat} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Floating action button when no session */}
      <AnimatePresence>
        {!currentSession && !showContactForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="fixed bottom-8 right-8"
          >
            <Button
              color="primary"
              size="lg"
              onPress={handleStartChat}
              isLoading={isCreatingSession}
              className="rounded-full shadow-lg"
              startContent={<Icon icon="mdi:chat" className="text-xl" />}
            >
              开始聊天
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'dark:bg-gray-800 dark:text-white',
        }}
      />
    </div>
  );
}

function WelcomeScreen({ onStartChat }: { onStartChat: () => void }) {
  const { theme, toggleTheme } = useAppStore();

  const features = [
    {
      icon: 'mdi:chat-processing',
      title: '即时聊天',
      description: '与专业客服人员实时交流，快速解决问题',
    },
    {
      icon: 'mdi:file-upload',
      title: '文件传输',
      description: '支持图片、文档等多种文件格式上传',
    },
    {
      icon: 'mdi:history',
      title: '历史记录',
      description: '自动保存聊天记录，随时查看历史对话',
    },
    {
      icon: 'mdi:security',
      title: '安全可靠',
      description: '端到端加密，保护您的隐私和数据安全',
    },
  ];

  return (
    <div className="text-center space-y-8 max-w-4xl mx-auto px-6">
      {/* Header */}
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-blue-500 rounded-full text-white text-4xl"
        >
          <Icon icon="mdi:message-text" />
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white"
        >
          欢迎使用客服系统
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
        >
          我们提供24/7专业客服支持，随时为您解答疑问
        </motion.p>
      </div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="text-blue-500 text-3xl mb-3">
              <Icon icon={feature.icon} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
      >
        <Button
          color="primary"
          size="lg"
          onPress={onStartChat}
          className="min-w-[200px]"
          startContent={<Icon icon="mdi:chat" />}
        >
          开始咨询
        </Button>
        
        <Button
          variant="light"
          size="lg"
          onPress={toggleTheme}
          startContent={<Icon icon={theme === 'dark' ? 'mdi:weather-sunny' : 'mdi:weather-night'} />}
        >
          {theme === 'dark' ? '亮色模式' : '暗色模式'}
        </Button>
      </motion.div>

      {/* Help text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="text-sm text-gray-500 dark:text-gray-400"
      >
        <p>
          点击"开始咨询"按钮，填写简单信息即可开始与客服对话
        </p>
      </motion.div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider>
        <AppContent />
      </HeroUIProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;