import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginStart, loginSuccess, loginFailure, logout } from '../store/slices/authSlice';
import apiClient from '../services/api/apiClient';
import { setItem, removeItem } from '../services/storage/localStorage';
import { TOKEN_KEY, REFRESH_TOKEN_KEY, ROUTES } from '../config/constants';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      dispatch(loginStart());
      try {
        const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
        const { user, accessToken, refreshToken } = response;

        // Store tokens
        setItem(TOKEN_KEY, accessToken);
        setItem(REFRESH_TOKEN_KEY, refreshToken);

        dispatch(loginSuccess(user));
        navigate(ROUTES.DASHBOARD);
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Login failed';
        dispatch(loginFailure(errorMessage));
        throw error;
      }
    },
    [dispatch, navigate]
  );

  const logoutUser = useCallback(() => {
    // Clear tokens
    removeItem(TOKEN_KEY);
    removeItem(REFRESH_TOKEN_KEY);

    dispatch(logout());
    navigate(ROUTES.LOGIN);
  }, [dispatch, navigate]);

  const checkAuth = useCallback(async () => {
    const token = getItem(TOKEN_KEY);
    if (!token) {
      return false;
    }

    try {
      const response = await apiClient.get<{ user: AuthResponse['user'] }>('/auth/me');
      dispatch(loginSuccess(response.user));
      return true;
    } catch (error) {
      logoutUser();
      return false;
    }
  }, [dispatch, logoutUser]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout: logoutUser,
    checkAuth,
  };
};