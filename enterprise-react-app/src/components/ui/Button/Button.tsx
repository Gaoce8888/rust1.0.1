import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';

interface ButtonProps extends MuiButtonProps {
  loading?: boolean;
  loadingText?: string;
}

const StyledButton = styled(MuiButton)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: 500,
  borderRadius: theme.shape.borderRadius,
  padding: '8px 24px',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: theme.shadows[4],
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}));

export const Button: React.FC<ButtonProps> = ({
  children,
  loading = false,
  loadingText = 'Loading...',
  disabled,
  startIcon,
  ...props
}) => {
  return (
    <StyledButton
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : startIcon}
      {...props}
    >
      {loading && loadingText ? loadingText : children}
    </StyledButton>
  );
};

export default Button;