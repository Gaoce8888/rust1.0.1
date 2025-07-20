import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

/**
 * TypingIndicator - 打字指示器组件
 * @param {Object} props
 * @param {boolean} props.isVisible - 是否显示
 * @param {string} props.userName - 正在打字的用户名
 * @param {string} props.size - 大小 (sm, md, lg)
 */
const TypingIndicator = ({ 
  isVisible = false, 
  userName = '',
  size = 'md'
}) => {
  if (!isVisible) return null;

  const sizeClasses = {
    sm: {
      container: 'h-6',
      dot: 'w-1.5 h-1.5',
      gap: 'gap-1',
      text: 'text-xs'
    },
    md: {
      container: 'h-8',
      dot: 'w-2 h-2',
      gap: 'gap-1.5',
      text: 'text-sm'
    },
    lg: {
      container: 'h-10',
      dot: 'w-2.5 h-2.5',
      gap: 'gap-2',
      text: 'text-base'
    }
  };

  const dotVariants = {
    start: { y: 0 },
    bounce: { 
      y: -8,
      transition: {
        duration: 0.5,
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut'
      }
    }
  };

  const dotDelays = [0, 0.15, 0.3];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      className={clsx(
        "flex items-center",
        sizeClasses[size].container
      )}
    >
      <div className="flex items-center gap-2">
        <div className={clsx(
          "flex items-center",
          sizeClasses[size].gap,
          "bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-2"
        )}>
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className={clsx(
                sizeClasses[size].dot,
                "bg-gray-500 dark:bg-gray-400 rounded-full"
              )}
              variants={dotVariants}
              initial="start"
              animate="bounce"
              transition={{
                delay: dotDelays[index]
              }}
            />
          ))}
        </div>
        
        {userName && (
          <span className={clsx(
            sizeClasses[size].text,
            "text-gray-500 dark:text-gray-400 ml-2"
          )}>
            {userName} 正在输入...
          </span>
        )}
      </div>
    </motion.div>
  );
};

// 简化版本，不需要 framer-motion
export const SimpleTypingIndicator = ({ 
  isVisible = false, 
  userName = '',
  size = 'md' 
}) => {
  if (!isVisible) return null;

  const sizeClasses = {
    sm: {
      container: 'h-6',
      dot: 'w-1.5 h-1.5',
      gap: 'gap-1',
      text: 'text-xs'
    },
    md: {
      container: 'h-8',
      dot: 'w-2 h-2',
      gap: 'gap-1.5',
      text: 'text-sm'
    },
    lg: {
      container: 'h-10',
      dot: 'w-2.5 h-2.5',
      gap: 'gap-2',
      text: 'text-base'
    }
  };

  return (
    <div className={clsx(
      "flex items-center animate-fade-in",
      sizeClasses[size].container
    )}>
      <div className="flex items-center gap-2">
        <div className={clsx(
          "flex items-center",
          sizeClasses[size].gap,
          "bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-2"
        )}>
          <div className={clsx(
            sizeClasses[size].dot,
            "bg-gray-500 dark:bg-gray-400 rounded-full",
            "animate-bounce-dot"
          )} style={{ animationDelay: '0ms' }} />
          <div className={clsx(
            sizeClasses[size].dot,
            "bg-gray-500 dark:bg-gray-400 rounded-full",
            "animate-bounce-dot"
          )} style={{ animationDelay: '150ms' }} />
          <div className={clsx(
            sizeClasses[size].dot,
            "bg-gray-500 dark:bg-gray-400 rounded-full",
            "animate-bounce-dot"
          )} style={{ animationDelay: '300ms' }} />
        </div>
        
        {userName && (
          <span className={clsx(
            sizeClasses[size].text,
            "text-gray-500 dark:text-gray-400 ml-2"
          )}>
            {userName} 正在输入...
          </span>
        )}
      </div>
    </div>
  );
};

export default TypingIndicator;