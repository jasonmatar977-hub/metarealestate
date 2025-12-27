"use client";

/**
 * Authentication Context with Supabase
 * 
 * Handles user authentication using Supabase Auth
 * Manages session state and user profile data
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { safeGetAllKeys, safeRemove } from '@/lib/safeStorage';
import { normalizeSupabaseError, isAuthError, debugLog } from '@/lib/asyncGuard';

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
  
  // Guards to prevent duplicate operations
  const authSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

  // Load user profile from Supabase
  const loadUserProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<User | null> => {
    try {
      // Get profile from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        const normalized = normalizeSupabaseError(error);
        debugLog('Error loading profile:', normalized);
        
        // If auth error, trigger session health check
        if (isAuthError(error)) {
          debugLog('Auth error detected in loadUserProfile, will trigger signOut');
          // Don't signOut here - let the caller handle it
        }
      }

      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: profile?.display_name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'user',
        displayName: profile?.display_name,
      };
    } catch (error) {
      const normalized = normalizeSupabaseError(error);
      debugLog('Exception loading user profile:', normalized);
      return null;
    }
  }, []);

  // Session health check - force signOut on auth errors
  const handleSessionHealthCheck = useCallback(async (error: any) => {
    if (isAuthError(error)) {
      debugLog('[AuthContext] Session health check failed - auth error detected, signing out');
      try {
        await supabase.auth.signOut();
        cleanupStaleAuthKeys();
        if (typeof window !== 'undefined') {
          window.location.href = '/login?message=Session expired, please sign in again';
        }
      } catch (signOutError) {
        debugLog('[AuthContext] Error during forced signOut:', signOutError);
      }
    }
  }, []);

  // Helper function to update user state from session
  const updateUserFromSession = useCallback(async (session: any) => {
    if (!isMountedRef.current) return;
    
    if (session?.user) {
      try {
        const userData = await loadUserProfile(session.user);
        if (!isMountedRef.current) return;
        
        if (userData) {
          debugLog('[AuthContext] User loaded:', userData.id);
          setIsAuthenticated(true);
          setUser(userData);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        const normalized = normalizeSupabaseError(error);
        debugLog('[AuthContext] Error loading user profile:', normalized);
        
        // Check if it's an auth error
        if (isAuthError(error)) {
          await handleSessionHealthCheck(error);
        }
        
        if (isMountedRef.current) {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    
    if (isMountedRef.current) {
      setLoadingSession(false);
      setIsLoading(false);
    }
  }, [loadUserProfile, handleSessionHealthCheck]);

  // Check for existing session on mount and keep it in sync
  useEffect(() => {
    // Prevent double initialization
    if (isInitializedRef.current) {
      debugLog('[AuthContext] Already initialized, skipping');
      return;
    }
    
    debugLog('[AuthContext] Initializing...');
    isInitializedRef.current = true;
    isMountedRef.current = true;
    
    if (typeof window === "undefined") {
      setIsLoading(false);
      setLoadingSession(false);
      return;
    }

    // Step 1: Get initial session - ALWAYS use getSession() to get current session
    debugLog('[AuthContext] Calling getSession()...');
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!isMountedRef.current) return;

      debugLog('[AuthContext] getSession result:', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userId: session?.user?.id,
        error: error?.message 
      });

      if (error) {
        const normalized = normalizeSupabaseError(error);
        debugLog('[AuthContext] getSession error:', normalized);
        
        // Clear any stale session data
        await supabase.auth.signOut({ scope: 'local' });
        cleanupStaleAuthKeys();
        
        if (isMountedRef.current) {
          setIsAuthenticated(false);
          setUser(null);
          setLoadingSession(false);
          setIsLoading(false);
        }
        return;
      }

      // If no session, clear any stale data
      if (!session) {
        cleanupStaleAuthKeys();
        if (isMountedRef.current) {
          setIsAuthenticated(false);
          setUser(null);
          setLoadingSession(false);
          setIsLoading(false);
        }
        return;
      }

      // CRITICAL: Validate session by calling getUser() to ensure it's still valid
      // This catches expired/invalid tokens that getSession() might still return
      debugLog('[AuthContext] Validating session with getUser()...');
      const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !validatedUser) {
        debugLog('[AuthContext] Session validation failed - getUser() returned error or null:', {
          error: userError?.message,
          hasUser: !!validatedUser
        });
        
        // Session is invalid - clear it locally
        await supabase.auth.signOut({ scope: 'local' });
        cleanupStaleAuthKeys();
        
        if (isMountedRef.current) {
          setIsAuthenticated(false);
          setUser(null);
          setLoadingSession(false);
          setIsLoading(false);
        }
        return;
      }

      // Session is valid - proceed with updateUserFromSession
      debugLog('[AuthContext] Session validated successfully');
      updateUserFromSession(session);
    }).catch((error) => {
      const normalized = normalizeSupabaseError(error);
      debugLog("[AuthContext] Exception getting session:", normalized);
      if (isMountedRef.current) {
        setLoadingSession(false);
        setIsLoading(false);
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    // Step 2: Listen for auth changes - this keeps state in sync
    // Only set up subscription once
    if (authSubscriptionRef.current) {
      debugLog('[AuthContext] Subscription already exists, cleaning up old one');
      authSubscriptionRef.current.unsubscribe();
    }
    
    debugLog('[AuthContext] Setting up onAuthStateChange listener...');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return;

      debugLog('[AuthContext] onAuthStateChange event:', event, {
        hasSession: !!session,
        userId: session?.user?.id
      });

      // Always refresh session from getSession() to ensure we have the latest
      // This prevents stale session issues
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error && isAuthError(error)) {
          await handleSessionHealthCheck(error);
          return;
        }
        await updateUserFromSession(currentSession);
      } else if (event === 'SIGNED_OUT') {
        if (isMountedRef.current) {
          setIsAuthenticated(false);
          setUser(null);
          setLoadingSession(false);
          setIsLoading(false);
        }
      } else {
        // For other events, use the session from the callback
        await updateUserFromSession(session);
      }
    });

    authSubscriptionRef.current = subscription;

    return () => {
      debugLog('[AuthContext] Cleaning up...');
      isMountedRef.current = false;
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [updateUserFromSession, handleSessionHealthCheck]);

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
   * CRITICAL: Clears any stale session before attempting login
   */
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      debugLog('[AuthContext] signIn start');
      setIsLoading(true);
      
      // Clear any stale state first
      setIsAuthenticated(false);
      setUser(null);
      
      // CRITICAL FIX: Clear any existing stale session before attempting login
      // This prevents "Invalid email or password" errors when a stale session exists
      debugLog('[AuthContext] Clearing any existing stale session before login...');
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        debugLog('[AuthContext] Found existing session, clearing it locally before login');
        await supabase.auth.signOut({ scope: 'local' });
        cleanupStaleAuthKeys();
      }
      
      // Now attempt login with fresh state
      debugLog('[AuthContext] Attempting signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const normalized = normalizeSupabaseError(error);
        debugLog('[AuthContext] signIn error:', normalized);
        
        // Log full error details for debugging (dev mode)
        console.error('[AuthContext] Login failed - Full error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint,
          fullError: error
        });
        
        // Check if auth error (shouldn't happen on signIn, but just in case)
        if (isAuthError(error)) {
          await handleSessionHealthCheck(error);
        }
        
        // Always clear state on error
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }

      // After successful signIn, always get the current session
      // This ensures we have the latest session data
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        const normalized = normalizeSupabaseError(sessionError);
        debugLog('[AuthContext] Error getting session after signIn:', normalized);
        
        if (isAuthError(sessionError)) {
          await handleSessionHealthCheck(sessionError);
        }
        
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }

      // Load user profile from the session
      const userData = await loadUserProfile(session.user);
      if (userData) {
        debugLog('[AuthContext] Profile loaded, setting user state');
        setIsAuthenticated(true);
        setUser(userData);
        return true;
      } else {
        debugLog('[AuthContext] Failed to load user profile');
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }
    } catch (error: any) {
      const normalized = normalizeSupabaseError(error);
      debugLog('[AuthContext] Login exception:', normalized);
      
      // Always clear state on exception
      setIsAuthenticated(false);
      setUser(null);
      return false;
    } finally {
      // ALWAYS reset loading state - this is critical
      debugLog('[AuthContext] isLoading reset in finally');
      setIsLoading(false);
    }
  }, [loadUserProfile, handleSessionHealthCheck]);

  /**
   * Register new user with Supabase
   * Email confirmation ON (most common)
   * Do NOT set isAuthenticated=true unless we receive a session
   */
  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      setIsLoading(true);

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
        console.error("[AuthContext] Registration error:", error);
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }

      //  IMPORTANT:
      // If Email Confirmation is enabled in Supabase,
      // signUp succeeds but data.session is NULL until user confirms email.
      if (!data.session) {
        setIsAuthenticated(false);
        setUser(null);
        return true; // registration success, but NOT logged in yet
      }

      //  If session exists, user is logged in immediately
      const userProfile = await loadUserProfile(data.session.user);
      if (userProfile) {
        setIsAuthenticated(true);
        setUser(userProfile);
        return true;
      }

      setIsAuthenticated(false);
      setUser(null);
      return false;
    } catch (err: any) {
      console.error("[AuthContext] Registration exception:", err);
      setIsAuthenticated(false);
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };


  /**
   * Logout from Supabase
   * Reliably signs out and clears session
   * Always redirects to /login after logout
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      debugLog('[AuthContext] Logout start');
      
      // Clear state first (optimistic)
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      setLoadingSession(false);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        const normalized = normalizeSupabaseError(error);
        debugLog('[AuthContext] Logout error:', normalized);
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
          debugLog('[AuthContext] Error clearing storage:', e);
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
      const normalized = normalizeSupabaseError(error);
      debugLog('[AuthContext] Logout exception:', normalized);
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
  }, []);

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
