import React from 'react';
import { Card as HeroCard, CardHeader, CardBody, CardFooter } from '@heroui/react';
import clsx from 'clsx';

const Card = ({
  children,
  header,
  footer,
  title,
  subtitle,
  shadow = 'medium',
  radius = 'medium',
  bordered = false,
  hoverable = false,
  clickable = false,
  onClick,
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  ...props
}) => {
  const shadows = {
    none: 'shadow-none',
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-lg'
  };

  const radiuses = {
    none: 'rounded-none',
    small: 'rounded-sm',
    medium: 'rounded-lg',
    large: 'rounded-xl'
  };

  return (
    <HeroCard
      className={clsx(
        'bg-white border border-gray-200',
        shadows[shadow],
        radiuses[radius],
        hoverable && 'hover:shadow-lg transition-shadow duration-200',
        clickable && 'cursor-pointer hover:scale-105 transition-transform duration-200',
        bordered && 'border-2',
        className
      )}
      isPressable={clickable}
      onPress={onClick}
      {...props}
    >
      {(header || title || subtitle) && (
        <CardHeader className={clsx('pb-2', headerClassName)}>
          {header || (
            <div className="flex flex-col">
              {title && (
                <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
          )}
        </CardHeader>
      )}
      
      <CardBody className={clsx('py-4', bodyClassName)}>
        {children}
      </CardBody>
      
      {footer && (
        <CardFooter className={clsx('pt-2', footerClassName)}>
          {footer}
        </CardFooter>
      )}
    </HeroCard>
  );
};

export default Card;