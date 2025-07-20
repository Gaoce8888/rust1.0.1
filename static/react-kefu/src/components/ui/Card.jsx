import React from 'react';

const Card = ({
  children,
  title,
  subtitle,
  header,
  footer,
  padding = 'medium',
  shadow = 'medium',
  border = false,
  className = '',
  ...props
}) => {
  const paddingClasses = {
    none: '',
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8'
  };
  
  const shadowClasses = {
    none: '',
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-lg',
    xl: 'shadow-xl'
  };
  
  const borderClass = border ? 'border border-gray-200' : '';
  const baseClasses = 'bg-white rounded-lg';
  
  const classes = `${baseClasses} ${shadowClasses[shadow]} ${borderClass} ${className}`;
  
  return (
    <div className={classes} {...props}>
      {header && (
        <div className="px-6 py-4 border-b border-gray-200">
          {header}
        </div>
      )}
      
      {(title || subtitle) && !header && (
        <div className="px-6 py-4 border-b border-gray-200">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
      )}
      
      <div className={paddingClasses[padding]}>
        {children}
      </div>
      
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;