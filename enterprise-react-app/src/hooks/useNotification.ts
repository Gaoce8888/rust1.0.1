import { useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';
import { addNotification, removeNotification } from '../store/slices/uiSlice';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

export const useNotification = () => {
  const dispatch = useAppDispatch();

  const showNotification = useCallback(
    (message: string, type: NotificationType = 'info', duration?: number) => {
      const id = `${Date.now()}-${Math.random()}`;
      
      dispatch(
        addNotification({
          id,
          message,
          type,
          duration,
        })
      );

      // Auto-remove notification after duration (default 5 seconds)
      if (duration !== 0) {
        setTimeout(() => {
          dispatch(removeNotification(id));
        }, duration || 5000);
      }

      return id;
    },
    [dispatch]
  );

  const hideNotification = useCallback(
    (id: string) => {
      dispatch(removeNotification(id));
    },
    [dispatch]
  );

  const success = useCallback(
    (message: string, duration?: number) => showNotification(message, 'success', duration),
    [showNotification]
  );

  const error = useCallback(
    (message: string, duration?: number) => showNotification(message, 'error', duration),
    [showNotification]
  );

  const warning = useCallback(
    (message: string, duration?: number) => showNotification(message, 'warning', duration),
    [showNotification]
  );

  const info = useCallback(
    (message: string, duration?: number) => showNotification(message, 'info', duration),
    [showNotification]
  );

  return {
    showNotification,
    hideNotification,
    success,
    error,
    warning,
    info,
  };
};