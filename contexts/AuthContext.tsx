"use client";

/**
 * Authentication Context with Supabase
 * 
 * Handles user authentication using Supabase Auth
 * Manages session state and user profile data
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  displayName?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  loadingSession: boolean; // True while checking initial session
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
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
  const [loadingSession, setLoadingSession] = useState(true); // Track initial session check

  // Load user profile from Supabase
  const loadUserProfile = async (supabaseUser: SupabaseUser): Promise<User | null> => {
    try {
      // Get profile from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading profile:', error);
      }

      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: profile?.display_name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'user',
        displayName: profile?.display_name,
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    console.log('[AuthContext] init');
    
    if (typeof window === "undefined") {
      setIsLoading(false);
      setLoadingSession(false);
      return;
    }

    let isMounted = true; // Prevent state updates if component unmounts

    // Step 1: Get initial session
    console.log('[AuthContext] Calling getSession()...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;

      console.log('[AuthContext] getSession result:', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id,
        error: error?.message 
      });

      if (error) {
        console.error('[AuthContext] getSession error:', error);
        setIsAuthenticated(false);
        setUser(null);
        setLoadingSession(false);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        loadUserProfile(session.user).then((userData) => {
          if (!isMounted) return;
          if (userData) {
            console.log('[AuthContext] User loaded:', userData.id);
            setIsAuthenticated(true);
            setUser(userData);
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
          setLoadingSession(false);
          setIsLoading(false);
        }).catch((error) => {
          console.error('[AuthContext] Error loading user profile:', error);
          if (isMounted) {
            setIsAuthenticated(false);
            setUser(null);
            setLoadingSession(false);
            setIsLoading(false);
          }
        });
      } else {
        console.log('[AuthContext] No session found');
        setIsAuthenticated(false);
        setUser(null);
        setLoadingSession(false);
        setIsLoading(false);
      }
    }).catch((error) => {
      console.error("[AuthContext] Error getting session:", error);
      if (isMounted) {
        setLoadingSession(false);
        setIsLoading(false);
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    // Step 2: Listen for auth changes
    console.log('[AuthContext] Setting up onAuthStateChange listener...');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log('[AuthContext] onAuthStateChange event:', event, {
        hasSession: !!session,
        userId: session?.user?.id
      });

      if (session?.user) {
        const userData = await loadUserProfile(session.user);
        if (userData) {
          console.log('[AuthContext] User id:', userData.id);
          setIsAuthenticated(true);
          setUser(userData);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        console.log('[AuthContext] Session cleared');
        setIsAuthenticated(false);
        setUser(null);
      }
      // Always set loading to false after auth state change
      setLoadingSession(false);
      setIsLoading(false);
    });

    return () => {
      console.log('[AuthContext] Cleaning up...');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Clean up stale auth keys from localStorage
   * Only removes keys starting with 'sb-' and 'supabase.auth.token'
   */
  const cleanupStaleAuthKeys = () => {
    if (typeof window === 'undefined') return;
    
    try {
      console.log('[AuthContext] Cleaning up stale auth keys from localStorage...');
      const keysToRemove: string[] = [];
      
      // Find all keys starting with 'sb-' or containing 'supabase.auth.token'
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
          keysToRemove.push(key);
        }
      }
      
      // Remove the keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`[AuthContext] Removed localStorage key: ${key}`);
      });
      
      if (keysToRemove.length > 0) {
        console.log(`[AuthContext] Cleaned up ${keysToRemove.length} stale auth keys`);
      } else {
        console.log('[AuthContext] No stale auth keys found');
      }
    } catch (error) {
      console.error('[AuthContext] Error cleaning up localStorage:', error);
    }
  };

  /**
   * Login with email and password using Supabase
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('[AuthContext] signIn start');
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AuthContext] signIn error:', {
          message: error.message,
          name: error.name,
          status: (error as any).status,
        });
        
        // Check if it's an auth-related error (invalid credentials, etc.)
        const isAuthError = error.name === 'AuthApiError' || 
                           error.message?.toLowerCase().includes('invalid') ||
                           error.message?.toLowerCase().includes('credentials') ||
                           error.message?.toLowerCase().includes('email') ||
                           error.message?.toLowerCase().includes('password');
        
        if (isAuthError) {
          console.log('[AuthContext] Auth error detected, cleaning up stale state...');
          // Sign out to clear any stale session
          await supabase.auth.signOut();
          console.log('[AuthContext] signOut cleanup executed');
          // Clean up localStorage keys
          cleanupStaleAuthKeys();
        }
        
        setIsLoading(false);
        return false;
      }

      if (data.user) {
        console.log('[AuthContext] signIn success');
        const userData = await loadUserProfile(data.user);
        if (userData) {
          console.log('[AuthContext] Profile loaded, setting user state');
          setIsAuthenticated(true);
          setUser(userData);
          setIsLoading(false);
          return true;
        } else {
          console.error('[AuthContext] Failed to load user profile');
          setIsLoading(false);
          return false;
        }
      }

      setIsLoading(false);
      return false;
    } catch (error: any) {
      console.error('[AuthContext] Login exception:', {
        message: error?.message,
        name: error?.name,
      });
      
      // On any exception, try to clean up
      try {
        await supabase.auth.signOut();
        cleanupStaleAuthKeys();
      } catch (cleanupError) {
        console.error('[AuthContext] Error during cleanup:', cleanupError);
      }
      
      setIsLoading(false);
      return false;
    } finally {
      // ALWAYS reset loading state, even if we return early
      console.log('[AuthContext] isLoading reset');
      setIsLoading(false);
    }
  };

  /**
   * Register new user with Supabase
   */
  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            username: userData.username,
          },
        },
      });

      if (error) {
        console.error('Registration error:', error);
        return false;
      }

      if (data.user) {
        // Profile will be created automatically by trigger
        // But we can update it with additional info if needed
        const userProfile = await loadUserProfile(data.user);
        if (userProfile) {
          setIsAuthenticated(true);
          setUser(userProfile);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  /**
   * Logout from Supabase
   * Reliably signs out and clears session
   */
  const logout = async (): Promise<void> => {
    try {
      // Clear state first
      setIsAuthenticated(false);
      setUser(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        // Still clear state even if signOut fails
        setIsAuthenticated(false);
        setUser(null);
      }
      
      // Clear any cached session data
      if (typeof window !== 'undefined') {
        // Clear localStorage if needed
        // Note: Supabase handles session storage automatically
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Ensure state is cleared even on error
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, loadingSession, login, register, logout }}>
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
