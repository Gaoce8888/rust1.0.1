import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';

// 主布局组件
const Layout = ({ 
  children, 
  className,
  sidebar,
  header,
  footer,
  sidebarCollapsed = false,
  onSidebarToggle,
  ...props 
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(sidebarCollapsed);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggle = () => {
    setCollapsed(!collapsed);
    onSidebarToggle?.(!collapsed);
  };

  return (
    <div className={clsx('min-h-screen bg-gray-50', className)} {...props}>
      {/* 头部 */}
      {header && (
        <header className={clsx(
          'fixed top-0 right-0 z-30 bg-white border-b border-gray-200',
          {
            'left-0': !sidebar,
            'left-64': sidebar && !collapsed && !isMobile,
            'left-16': sidebar && collapsed && !isMobile,
            'left-0': sidebar && isMobile
          }
        )}>
          {header}
        </header>
      )}

      <div className="flex">
        {/* 侧边栏 */}
        {sidebar && (
          <>
            {/* 移动端遮罩 */}
            {isMobile && !collapsed && (
              <div
                className="fixed inset-0 z-20 bg-black bg-opacity-50"
                onClick={handleToggle}
              />
            )}
            
            <aside className={clsx(
              'fixed top-0 left-0 z-40 h-full bg-white border-r border-gray-200 transition-all duration-300',
              {
                'w-64': !collapsed,
                'w-16': collapsed && !isMobile,
                '-translate-x-full': collapsed && isMobile,
                'translate-x-0': !collapsed || !isMobile
              }
            )}>
              {React.cloneElement(sidebar, { collapsed, onToggle: handleToggle })}
            </aside>
          </>
        )}

        {/* 主内容区域 */}
        <main className={clsx(
          'flex-1 transition-all duration-300',
          {
            'ml-0': !sidebar,
            'ml-64': sidebar && !collapsed && !isMobile,
            'ml-16': sidebar && collapsed && !isMobile,
            'ml-0': sidebar && isMobile
          },
          {
            'pt-16': header,
            'pt-0': !header
          }
        )}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* 底部 */}
      {footer && (
        <footer className={clsx(
          'bg-white border-t border-gray-200',
          {
            'ml-0': !sidebar,
            'ml-64': sidebar && !collapsed && !isMobile,
            'ml-16': sidebar && collapsed && !isMobile,
            'ml-0': sidebar && isMobile
          }
        )}>
          {footer}
        </footer>
      )}
    </div>
  );
};

// 头部组件
const Header = ({ 
  title, 
  subtitle,
  logo,
  actions,
  user,
  onMenuClick,
  className,
  ...props 
}) => {
  return (
    <div className={clsx('h-16 px-6 flex items-center justify-between', className)} {...props}>
      <div className="flex items-center gap-4">
        {/* 菜单按钮 */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Logo */}
        {logo && (
          <div className="flex items-center">
            {logo}
          </div>
        )}

        {/* 标题 */}
        <div>
          {title && (
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* 操作按钮 */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}

        {/* 用户信息 */}
        {user && (
          <div className="flex items-center gap-3">
            {user}
          </div>
        )}
      </div>
    </div>
  );
};

// 侧边栏组件
const Sidebar = ({ 
  collapsed = false,
  onToggle,
  logo,
  menu,
  footer,
  className,
  ...props 
}) => {
  return (
    <div className={clsx('h-full flex flex-col', className)} {...props}>
      {/* Logo区域 */}
      {logo && (
        <div className={clsx(
          'h-16 px-4 flex items-center border-b border-gray-200',
          {
            'justify-center': collapsed,
            'justify-start': !collapsed
          }
        )}>
          {logo}
        </div>
      )}

      {/* 菜单区域 */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {menu}
      </nav>

      {/* 底部区域 */}
      {footer && (
        <div className="p-4 border-t border-gray-200">
          {footer}
        </div>
      )}

      {/* 折叠按钮 */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="absolute top-4 -right-3 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg 
            className={clsx('w-3 h-3 transition-transform', {
              'rotate-180': collapsed
            })} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
    </div>
  );
};

// 菜单项组件
const MenuItem = ({ 
  icon,
  children,
  active = false,
  collapsed = false,
  onClick,
  href,
  className,
  ...props 
}) => {
  const content = (
    <div className={clsx(
      'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-md mx-2',
      {
        'bg-blue-50 text-blue-700': active,
        'text-gray-700 hover:bg-gray-100 hover:text-gray-900': !active,
        'justify-center': collapsed,
        'justify-start': !collapsed
      },
      className
    )}>
      {icon && (
        <span className="flex-shrink-0">
          {icon}
        </span>
      )}
      {!collapsed && (
        <span className="truncate">
          {children}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className="w-full text-left" {...props}>
      {content}
    </button>
  );
};

// 子菜单组件
const SubMenu = ({ 
  icon,
  title,
  children,
  collapsed = false,
  defaultOpen = false,
  className,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    if (!collapsed) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={clsx('mx-2', className)} {...props}>
      <button
        onClick={handleToggle}
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-md',
          'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
          {
            'justify-center': collapsed,
            'justify-between': !collapsed
          }
        )}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="flex-shrink-0">
              {icon}
            </span>
          )}
          {!collapsed && (
            <span className="truncate">
              {title}
            </span>
          )}
        </div>
        {!collapsed && (
          <svg 
            className={clsx('w-4 h-4 transition-transform', {
              'rotate-180': isOpen
            })} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {!collapsed && isOpen && (
        <div className="pl-6 mt-1">
          {children}
        </div>
      )}
    </div>
  );
};

// 面包屑组件
const Breadcrumb = ({ 
  items = [],
  separator = '/',
  className,
  ...props 
}) => {
  return (
    <nav className={clsx('flex', className)} {...props}>
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-gray-400">
                {separator}
              </span>
            )}
            {item.href ? (
              <a 
                href={item.href}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                {item.title}
              </a>
            ) : (
              <span className={clsx(
                'text-sm',
                index === items.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-500'
              )}>
                {item.title}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// 内容区域组件
const Content = ({ 
  title,
  subtitle,
  breadcrumb,
  extra,
  children,
  className,
  ...props 
}) => {
  return (
    <div className={clsx('space-y-6', className)} {...props}>
      {/* 页面头部 */}
      {(title || subtitle || breadcrumb || extra) && (
        <div className="space-y-4">
          {breadcrumb && breadcrumb}
          
          <div className="flex items-start justify-between">
            <div>
              {title && (
                <h1 className="text-2xl font-bold text-gray-900">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500">
                  {subtitle}
                </p>
              )}
            </div>
            
            {extra && (
              <div className="flex-shrink-0">
                {extra}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 主要内容 */}
      {children}
    </div>
  );
};

Layout.displayName = 'Layout';
Header.displayName = 'Header';
Sidebar.displayName = 'Sidebar';
MenuItem.displayName = 'MenuItem';
SubMenu.displayName = 'SubMenu';
Breadcrumb.displayName = 'Breadcrumb';
Content.displayName = 'Content';

export { 
  Layout, 
  Header, 
  Sidebar, 
  MenuItem, 
  SubMenu, 
  Breadcrumb, 
  Content 
};