import React from 'react';
import { cn } from '../../utils';
import { LoadingProps } from '../../types';
import { Loader2 } from 'lucide-react';

const Loading: React.FC<LoadingProps> = ({ 
  size = 'md', 
  color = 'currentColor',
  text,
  className,
  style 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div 
      className={cn('flex items-center justify-center', className)}
      style={style}
    >
      <Loader2 
        className={cn(
          'animate-spin',
          sizeClasses[size]
        )}
        style={{ color }}
      />
      {text && (
        <span 
          className={cn(
            'ml-2 text-gray-600',
            textSizeClasses[size]
          )}
        >
          {text}
        </span>
      )}
    </div>
  );
};

export default Loading;