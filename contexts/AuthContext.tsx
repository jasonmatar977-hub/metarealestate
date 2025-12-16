"use client";

/**
 * Authentication Context
 * 
 * SECURITY NOTE: This is front-end only authentication state.
 * Real authentication must be implemented on the backend with:
 * - JWT tokens or session management
 * - Secure password hashing (bcrypt, argon2)
 * - CSRF protection
 * - Rate limiting
 * - Server-side session validation
 * 
 * This context is for UI state management only.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  name: string;
  username: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
}

interface RegisterData {
  fullName: string;
  username: string;
  email: string;
  address: string;
  country: string;
  birthday: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing auth state on mount (from localStorage)
  // Guard with window check for SSR safety
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    try {
      const storedAuth = localStorage.getItem('auth');
      if (storedAuth) {
        try {
          const authData = JSON.parse(storedAuth);
          if (authData.isAuthenticated && authData.user) {
            setIsAuthenticated(true);
            setUser(authData.user);
          }
        } catch (error) {
          // Invalid stored data, clear it
          if (typeof window !== "undefined") {
            localStorage.removeItem('auth');
          }
        }
      }
    } catch (error) {
      console.error("Error loading auth state:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Mock login function
   * SECURITY: In production, this should call a backend API
   * that validates credentials and returns a secure token.
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    // TODO: Replace with real API call
    // const response = await fetch('/api/auth/login', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email, password }),
    // });
    // if (!response.ok) return false;
    // const { token, user } = await response.json();
    // Store token securely (httpOnly cookie preferred)
    
    // Mock implementation for front-end only
    // In real app, backend would verify credentials
    const mockUser: User = {
      email,
      name: "User",
      username: email.split('@')[0],
    };

    setIsAuthenticated(true);
    setUser(mockUser);
    
    // Guard localStorage access
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem('auth', JSON.stringify({ isAuthenticated: true, user: mockUser }));
      } catch (error) {
        console.error("Error saving auth state:", error);
      }
    }
    
    return true;
  };

  /**
   * Mock register function
   * SECURITY: In production, this should call a backend API
   * that validates data, hashes passwords, and creates user account.
   */
  const register = async (userData: RegisterData): Promise<boolean> => {
    // TODO: Replace with real API call
    // const response = await fetch('/api/auth/register', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(userData),
    // });
    // if (!response.ok) return false;
    // const { token, user } = await response.json();
    
    // Mock implementation
    const newUser: User = {
      email: userData.email,
      name: userData.fullName,
      username: userData.username,
    };

    setIsAuthenticated(true);
    setUser(newUser);
    
    // Guard localStorage access
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem('auth', JSON.stringify({ isAuthenticated: true, user: newUser }));
      } catch (error) {
        console.error("Error saving auth state:", error);
      }
    }
    
    return true;
  };

  /**
   * Logout function
   * SECURITY: In production, this should also call backend to invalidate session/token
   */
  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    
    // Guard localStorage access
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem('auth');
      } catch (error) {
        console.error("Error clearing auth state:", error);
      }
    }
    
    // TODO: Call backend logout endpoint to invalidate token
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

