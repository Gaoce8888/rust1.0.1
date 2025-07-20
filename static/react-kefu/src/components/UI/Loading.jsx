import React from 'react';
import { Spinner } from '@heroui/react';
import clsx from 'clsx';

const Loading = ({
  size = 'medium',
  color = 'primary',
  type = 'spinner',
  text,
  overlay = false,
  className,
  ...props
}) => {
  const sizes = {
    small: { spinner: 'h-4 w-4', text: 'text-sm' },
    medium: { spinner: 'h-6 w-6', text: 'text-base' },
    large: { spinner: 'h-8 w-8', text: 'text-lg' },
    xl: { spinner: 'h-12 w-12', text: 'text-xl' }
  };

  const colors = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600'
  };

  // 旋转动画组件
  const SpinnerComponent = () => (
    <svg
      className={clsx(
        'animate-spin',
        sizes[size].spinner,
        colors[color]
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // 点动画组件
  const DotsComponent = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={clsx(
            'rounded-full bg-current animate-pulse',
            size === 'small' && 'h-2 w-2',
            size === 'medium' && 'h-3 w-3',
            size === 'large' && 'h-4 w-4',
            size === 'xl' && 'h-5 w-5',
            colors[color]
          )}
          style={{
            animationDelay: `${i * 0.3}s`,
            animationDuration: '1.4s'
          }}
        />
      ))}
    </div>
  );

  // 脉冲动画组件
  const PulseComponent = () => (
    <div
      className={clsx(
        'rounded-full bg-current animate-ping',
        sizes[size].spinner,
        colors[color]
      )}
    />
  );

  const getLoadingComponent = () => {
    switch (type) {
      case 'dots':
        return <DotsComponent />;
      case 'pulse':
        return <PulseComponent />;
      case 'heroui':
        return <Spinner size={size} color={color} {...props} />;
      default:
        return <SpinnerComponent />;
    }
  };

  const loadingContent = (
    <div className={clsx(
      'flex flex-col items-center justify-center gap-3',
      overlay && 'p-8',
      className
    )}>
      {getLoadingComponent()}
      {text && (
        <p className={clsx(
          'font-medium',
          sizes[size].text,
          colors[color]
        )}>
          {text}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg">
          {loadingContent}
        </div>
      </div>
    );
  }

  return loadingContent;
};

// 页面级别的加载组件
const PageLoading = ({ text = '加载中...', ...props }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <Loading
      size="large"
      text={text}
      className="bg-white p-8 rounded-lg shadow-md"
      {...props}
    />
  </div>
);

// 内容加载组件
const ContentLoading = ({ text, height = 'h-32', ...props }) => (
  <div className={clsx('flex items-center justify-center', height)}>
    <Loading text={text} {...props} />
  </div>
);

// 按钮加载组件
const ButtonLoading = ({ size = 'small', ...props }) => (
  <Loading size={size} type="spinner" className="inline-flex" {...props} />
);

export { Loading, PageLoading, ContentLoading, ButtonLoading };
export default Loading;