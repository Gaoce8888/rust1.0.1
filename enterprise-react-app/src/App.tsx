import React, { useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, StyledEngineProvider } from '@mui/material';
import { store } from './store';
import { useAppSelector } from './store/hooks';
import { useAuth } from './hooks/useAuth';
import { ROUTES } from './config/constants';

// Layouts
import MainLayout from './layouts/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Components
import LoadingSpinner from './components/ui/LoadingSpinner';
import NotificationContainer from './components/common/NotificationContainer';
import ErrorBoundary from './components/common/ErrorBoundary';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  
  return children;
};

const AppContent: React.FC = () => {
  const { theme } = useAppSelector((state) => state.ui);
  const { checkAuth, isLoading } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: theme,
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontWeight: 700,
          },
          h2: {
            fontWeight: 600,
          },
          h3: {
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 8,
        },
      }),
    [theme]
  );

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading application..." />;
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <NotificationContainer />
      <Routes>
        {/* Public Routes */}
        <Route path={ROUTES.LOGIN} element={<Login />} />
        
        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.USERS} element={<div>Users Page</div>} />
          <Route path={ROUTES.PROFILE} element={<div>Profile Page</div>} />
          <Route path={ROUTES.SETTINGS} element={<div>Settings Page</div>} />
        </Route>
        
        {/* 404 Route */}
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </ThemeProvider>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <StyledEngineProvider injectFirst>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </Provider>
      </StyledEngineProvider>
    </ErrorBoundary>
  );
}

export default App;
