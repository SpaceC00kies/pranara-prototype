'use client';

/**
 * Authentication Context
 * Manages user authentication state and provides auth methods
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
  last_active: string;
}

export interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
}

export interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  chatSessions: ChatSession[];
  
  // Methods
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  
  // Session management
  createSession: (title?: string) => Promise<{ success: boolean; session?: ChatSession; error?: string }>;
  deleteSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  renameSession: (sessionId: string, newTitle: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  const isAuthenticated = !!user;

  // Check for existing auth token on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Validate token by trying to fetch user sessions
      const response = await fetch('/api/chat/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Token is valid, but we need user info
        // For now, we'll extract user info from token or make another call
        // This is a simplified approach - in production you might decode JWT
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (userData.id) {
          setUser(userData);
          setChatSessions(data.sessions || []);
        } else {
          // Clear invalid data
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
        }
      } else {
        // Token is invalid
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth data
        localStorage.setItem('auth_token', data.auth_token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        
        // Update state
        setUser(data.user);
        setChatSessions(data.chat_sessions || []);
        
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string, displayName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password,
          display_name: displayName
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth data
        localStorage.setItem('auth_token', data.auth_token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        
        // Update state
        setUser(data.user);
        setChatSessions(data.chat_session ? [data.chat_session] : []);
        
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Call logout API
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local state regardless of API call result
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      setUser(null);
      setChatSessions([]);
    }
  };

  const refreshSessions = async (): Promise<void> => {
    if (!isAuthenticated) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/chat/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChatSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
    }
  };

  const createSession = async (title?: string): Promise<{ success: boolean; session?: ChatSession; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: title || 'New Chat' })
      });

      const data = await response.json();

      if (response.ok) {
        const newSession = data.session;
        setChatSessions(prev => [newSession, ...prev]);
        return { success: true, session: newSession };
      } else {
        return { success: false, error: data.error || 'Failed to create session' };
      }
    } catch (error) {
      console.error('Create session error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const deleteSession = async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setChatSessions(prev => prev.filter(session => session.id !== sessionId));
        return { success: true };
      } else {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to delete session' };
      }
    } catch (error) {
      console.error('Delete session error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const renameSession = async (sessionId: string, newTitle: string): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });

      if (response.ok) {
        setChatSessions(prev => prev.map(session => 
          session.id === sessionId 
            ? { ...session, title: newTitle }
            : session
        ));
        return { success: true };
      } else {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to rename session' };
      }
    } catch (error) {
      console.error('Rename session error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    chatSessions,
    login,
    register,
    logout,
    refreshSessions,
    createSession,
    deleteSession,
    renameSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}