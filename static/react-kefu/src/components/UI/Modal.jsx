import React from 'react';
import { Modal as HeroModal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import Button from './Button';
import clsx from 'clsx';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  hideCloseButton = false,
  isDismissable = true,
  backdrop = 'blur',
  placement = 'center',
  footer,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
  isLoading = false,
  className,
  ...props
}) => {
  const sizes = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full'
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      placement={placement}
      backdrop={backdrop}
      isDismissable={isDismissable && !isLoading}
      hideCloseButton={hideCloseButton}
      className={clsx(sizes[size], className)}
      {...props}
    >
      <ModalContent>
        {(onModalClose) => (
          <>
            {title && (
              <ModalHeader className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              </ModalHeader>
            )}
            
            <ModalBody className="py-4">
              {children}
            </ModalBody>
            
            {(footer !== null) && (
              <ModalFooter>
                {footer || (
                  <div className="flex gap-2 justify-end">
                    {onCancel !== null && (
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        isDisabled={isLoading}
                      >
                        {cancelText}
                      </Button>
                    )}
                    {onConfirm && (
                      <Button
                        variant={confirmVariant}
                        onClick={handleConfirm}
                        isLoading={isLoading}
                      >
                        {confirmText}
                      </Button>
                    )}
                  </div>
                )}
              </ModalFooter>
            )}
          </>
        )}
      </ModalContent>
    </HeroModal>
  );
};

export default Modal;