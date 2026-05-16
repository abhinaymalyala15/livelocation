import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { setAuthToken } from '@/api/authApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthToken(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setAuthError({
        type: 'auth_required',
        message: 'Authentication failed',
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = await base44.auth.login(email, password);
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
      return currentUser;
    } catch (error) {
      setAuthError({
        type: 'login_failed',
        message: 'Invalid credentials',
      });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setAuthError({
        type: 'auth_required',
        message: 'Authentication required',
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    await base44.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({
      type: 'auth_required',
      message: 'Signed out',
    });
  };

  const navigateToLogin = () => {
    const returnPath = window.location.pathname + window.location.search;
    window.location.href = `/login?return=${encodeURIComponent(returnPath)}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        authChecked,
        login,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
