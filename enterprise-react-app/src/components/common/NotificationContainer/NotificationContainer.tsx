import React from 'react';
import { Alert, Snackbar, Stack } from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { removeNotification } from '../../../store/slices/uiSlice';

export const NotificationContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.ui.notifications);

  const handleClose = (id: string) => {
    dispatch(removeNotification(id));
  };

  return (
    <Stack spacing={2} sx={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration || 5000}
          onClose={() => handleClose(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => handleClose(notification.id)}
            severity={notification.type}
            sx={{ width: '100%' }}
            variant="filled"
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
};