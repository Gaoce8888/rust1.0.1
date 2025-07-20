import React from 'react';
import { twMerge } from 'tailwind-merge';

const Card = ({ 
  className, 
  children,
  shadow = 'medium',
  rounded = 'lg',
  border = true,
  padding = 'medium',
  hoverable = false,
  clickable = false,
  ...props 
}) => {
  const baseStyles = 'bg-white transition-all duration-200';
  
  const shadows = {
    none: '',
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-lg',
    xl: 'shadow-xl'
  };
  
  const roundedSizes = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full'
  };
  
  const paddingSizes = {
    none: '',
    small: 'p-3',
    medium: 'p-5',
    large: 'p-8'
  };
  
  const classes = twMerge(
    baseStyles,
    shadows[shadow],
    roundedSizes[rounded],
    paddingSizes[padding],
    border && 'border border-gray-200',
    hoverable && 'hover:shadow-lg hover:scale-[1.02]',
    clickable && 'cursor-pointer',
    className
  );
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({ className, children, ...props }) => {
  const classes = twMerge(
    'pb-4 border-b border-gray-200',
    className
  );
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

const CardTitle = ({ className, children, ...props }) => {
  const classes = twMerge(
    'text-lg font-semibold text-gray-900',
    className
  );
  
  return (
    <h3 className={classes} {...props}>
      {children}
    </h3>
  );
};

const CardDescription = ({ className, children, ...props }) => {
  const classes = twMerge(
    'text-sm text-gray-600 mt-1',
    className
  );
  
  return (
    <p className={classes} {...props}>
      {children}
    </p>
  );
};

const CardBody = ({ className, children, ...props }) => {
  const classes = twMerge(
    'py-4',
    className
  );
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

const CardFooter = ({ className, children, ...props }) => {
  const classes = twMerge(
    'pt-4 border-t border-gray-200',
    className
  );
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;