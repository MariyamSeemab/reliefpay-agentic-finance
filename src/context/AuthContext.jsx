import React, { createContext, useState, useCallback, useEffect } from 'react';
import { apiFetch, clearToken, getToken, setToken, UNAUTHORIZED_EVENT } from '../lib/api';

export const AuthContext = createContext();

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_TAKEN: 'An account with this email already exists',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD: 'Password must be at least 6 characters',
  INVALID_NAME: 'Please enter your name',
  INVALID_ROLE: 'Please choose a valid role',
};

function friendlyError(err) {
  return ERROR_MESSAGES[err?.code] || err?.message || 'Something went wrong';
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(() => Boolean(getToken()));
  const [error, setError] = useState(null);

  // Restore the session from the stored token.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsRestoring(false);
      return;
    }
    let cancelled = false;
    apiFetch('/auth/me')
      .then(({ user }) => {
        if (!cancelled) setCurrentUser({ ...user, token });
      })
      .catch(() => {
        clearToken();
        if (!cancelled) setCurrentUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setCurrentUser(null);
    setError(null);
  }, []);

  // Any 401 from the API ends the session.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const authenticate = useCallback(async (path, body) => {
    setIsLoading(true);
    setError(null);
    try {
      const { token, user } = await apiFetch(path, { method: 'POST', body, auth: false });
      setToken(token);
      setCurrentUser({ ...user, token });
      return user;
    } catch (err) {
      const message = friendlyError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    (email, password) => authenticate('/auth/login', { email, password }),
    [authenticate],
  );

  const signup = useCallback(
    (name, email, password, role) => authenticate('/auth/signup', { name, email, password, role }),
    [authenticate],
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        isRestoring,
        error,
        login,
        signup,
        logout,
        isAuthenticated: !!currentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
