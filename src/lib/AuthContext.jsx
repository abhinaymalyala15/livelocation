import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { setAuthToken, apiLoginDriver } from '@/api/authApi';
import { onSessionRevoked } from '@/lib/sessionRevoke';
import { releaseTrackingSocket } from '@/services/socketService';
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const handlingRevokeRef = useRef(false);

  useEffect(() => {
    checkAppState();
  }, []);

  useEffect(() => {
    return onSessionRevoked(async () => {
      if (handlingRevokeRef.current) return;
      handlingRevokeRef.current = true;
      releaseTrackingSocket();
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setAuthError({ type: 'auth_required', message: 'Signed out' });
      toast.info('Signed in on another device. GPS tracking moved to that device.');
      const returnPath = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?return=${returnPath}`;
    });
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

  const login = async (identifier, password, { asDriver = false } = {}) => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = asDriver
        ? await apiLoginDriver(identifier, password)
        : await base44.auth.login(String(identifier).trim().toLowerCase(), password);
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
      setAuthError(null);
      return currentUser;
    } catch (error) {
      const message =
        error?.message ||
        (error?.status === 401
          ? asDriver
            ? 'Invalid name or password'
            : 'Invalid email or password'
          : 'Sign in failed');
      setAuthError({
        type: 'login_failed',
        message,
      });
      const err = error instanceof Error ? error : new Error(message);
      err.status = error?.status;
      throw err;
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
