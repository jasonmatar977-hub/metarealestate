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
import { safeGetAllKeys, safeRemove } from '@/lib/safeStorage';

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

  // Check for existing session on mount and keep it in sync
  useEffect(() => {
    console.log('[AuthContext] init');
    
    if (typeof window === "undefined") {
      setIsLoading(false);
      setLoadingSession(false);
      return;
    }

    let isMounted = true; // Prevent state updates if component unmounts

    // Helper function to update user state from session
    const updateUserFromSession = async (session: any) => {
      if (!isMounted) return;
      
      if (session?.user) {
        try {
          const userData = await loadUserProfile(session.user);
          if (!isMounted) return;
          
          if (userData) {
            console.log('[AuthContext] User loaded:', userData.id);
            setIsAuthenticated(true);
            setUser(userData);
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        } catch (error) {
          console.error('[AuthContext] Error loading user profile:', error);
          if (isMounted) {
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      
      if (isMounted) {
        setLoadingSession(false);
        setIsLoading(false);
      }
    };

    // Step 1: Get initial session - ALWAYS use getSession() to get current session
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
        // Clear any stale session data
        if (typeof window !== 'undefined') {
          try {
            const supabaseKeys = Object.keys(localStorage).filter(key => 
              key.startsWith('sb-') || key.includes('supabase')
            );
            supabaseKeys.forEach(key => {
              try {
                localStorage.removeItem(key);
              } catch (e) {
                // Ignore
              }
            });
          } catch (e) {
            // Ignore
          }
        }
        setIsAuthenticated(false);
        setUser(null);
        setLoadingSession(false);
        setIsLoading(false);
        return;
      }

      // If no session, clear any stale data
      if (!session) {
        if (typeof window !== 'undefined') {
          try {
            const supabaseKeys = Object.keys(localStorage).filter(key => 
              key.startsWith('sb-') || key.includes('supabase')
            );
            supabaseKeys.forEach(key => {
              try {
                localStorage.removeItem(key);
              } catch (e) {
                // Ignore
              }
            });
          } catch (e) {
            // Ignore
          }
        }
      }

      updateUserFromSession(session);
    }).catch((error) => {
      console.error("[AuthContext] Error getting session:", error);
      if (isMounted) {
        setLoadingSession(false);
        setIsLoading(false);
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    // Step 2: Listen for auth changes - this keeps state in sync
    console.log('[AuthContext] Setting up onAuthStateChange listener...');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log('[AuthContext] onAuthStateChange event:', event, {
        hasSession: !!session,
        userId: session?.user?.id
      });

      // Always refresh session from getSession() to ensure we have the latest
      // This prevents stale session issues
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        await updateUserFromSession(currentSession);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUser(null);
        setLoadingSession(false);
        setIsLoading(false);
      } else {
        // For other events, use the session from the callback
        await updateUserFromSession(session);
      }
    });

    return () => {
      console.log('[AuthContext] Cleaning up...');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Clean up stale auth keys from storage (safe storage with fallback)
   * Only removes keys starting with 'sb-' and 'supabase.auth.token'
   */
  const cleanupStaleAuthKeys = () => {
    if (typeof window === 'undefined') return;
    
    try {
      console.log('[AuthContext] Cleaning up stale auth keys from storage...');
      const allKeys = safeGetAllKeys();
      const keysToRemove = allKeys.filter(
        key => key.startsWith('sb-') || key.includes('supabase.auth.token')
      );
      
      // Remove the keys using safe storage
      keysToRemove.forEach(key => {
        safeRemove(key);
        console.log(`[AuthContext] Removed storage key: ${key}`);
      });
      
      if (keysToRemove.length > 0) {
        console.log(`[AuthContext] Cleaned up ${keysToRemove.length} stale auth keys`);
      } else {
        console.log('[AuthContext] No stale auth keys found');
      }
    } catch (error) {
      console.error('[AuthContext] Error cleaning up storage:', error);
    }
  };

  /**
   * Login with email and password using Supabase
   * Always uses getSession() after signIn to ensure we have the latest session
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('[AuthContext] signIn start');
      setIsLoading(true);
      
      // Clear any stale state first
      setIsAuthenticated(false);
      setUser(null);
      
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
        
        // Always clear state on error
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return false;
      }

      // After successful signIn, always get the current session
      // This ensures we have the latest session data
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.error('[AuthContext] Error getting session after signIn:', sessionError);
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return false;
      }

      // Load user profile from the session
      const userData = await loadUserProfile(session.user);
      if (userData) {
        console.log('[AuthContext] Profile loaded, setting user state');
        setIsAuthenticated(true);
        setUser(userData);
        setIsLoading(false);
        return true;
      } else {
        console.error('[AuthContext] Failed to load user profile');
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return false;
      }
    } catch (error: any) {
      console.error('[AuthContext] Login exception:', {
        message: error?.message,
        name: error?.name,
      });
      
      // Always clear state on exception
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return false;
    } finally {
      // ALWAYS reset loading state
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
   * Always redirects to /login after logout
   */
  const logout = async (): Promise<void> => {
    try {
      // Clear state first (optimistic)
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      setLoadingSession(false);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[AuthContext] Logout error:', error);
      }
      
      // Clean up any stale auth keys and cached session data
      cleanupStaleAuthKeys();
      
      // Clear any cached session in localStorage/sessionStorage
      if (typeof window !== 'undefined') {
        try {
          // Clear Supabase session storage
          const supabaseKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('sb-') || key.includes('supabase')
          );
          supabaseKeys.forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (e) {
              // Ignore errors
            }
          });
          
          // Clear sessionStorage too
          const sessionKeys = Object.keys(sessionStorage).filter(key => 
            key.startsWith('sb-') || key.includes('supabase')
          );
          sessionKeys.forEach(key => {
            try {
              sessionStorage.removeItem(key);
            } catch (e) {
              // Ignore errors
            }
          });
        } catch (e) {
          console.warn('[AuthContext] Error clearing storage:', e);
        }
      }
      
      // Always clear state regardless of error
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      setLoadingSession(false);
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('[AuthContext] Logout exception:', error);
      // Ensure state is cleared even on error
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      setLoadingSession(false);
      
      // Still redirect
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
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
