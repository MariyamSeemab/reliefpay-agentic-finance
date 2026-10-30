import React, { createContext, useState, useCallback } from 'react';
import { INITIAL_USER_ACCOUNTS } from '../data/mockData';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mock login - simulate API call
  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock authentication - find user by email
      const user = INITIAL_USER_ACCOUNTS.find(u => u.email === email);
      
      if (user && password === 'password123') {
        setCurrentUser({ ...user, token: 'mock-token-' + Date.now() });
        return user;
      } else {
        throw new Error('Invalid email or password');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mock signup - create new user
  const signup = useCallback(async (name, email, role) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if user exists
      if (INITIAL_USER_ACCOUNTS.find(u => u.email === email)) {
        throw new Error('User already exists');
      }
      
      const newUser = {
        id: `usr-${Date.now()}`,
        name,
        email,
        role,
        org: 'New User Organization',
        title: 'User'
      };
      
      setCurrentUser({ ...newUser, token: 'mock-token-' + Date.now() });
      return newUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mock logout
  const logout = useCallback(() => {
    setCurrentUser(null);
    setError(null);
  }, []);

  // Switch role (for testing)
  const switchRole = useCallback((role) => {
    const user = INITIAL_USER_ACCOUNTS.find(u => u.role === role);
    if (user) {
      setCurrentUser({ ...user, token: 'mock-token-' + Date.now() });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        error,
        login,
        signup,
        logout,
        switchRole,
        isAuthenticated: !!currentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
