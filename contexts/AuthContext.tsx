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
import { checkSupabaseHealth, clearHealthCheckCache, withSupabaseHealthCheck } from '@/lib/supabaseHealth';

interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  displayName?: string;
  is_verified?: boolean;
  role?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  loadingSession: boolean; // True while checking initial session
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; needsConfirmation?: boolean; error?: string }>;
  logout: () => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
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
  
  // Helper to safely unsubscribe
  const unsubscribeAuth = useCallback(() => {
    if (authSubscriptionRef.current) {
      authSubscriptionRef.current.unsubscribe();
      authSubscriptionRef.current = null;
    }
  }, []);

  // Load user profile from Supabase
  const loadUserProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<User | null> => {
    try {
      // Get profile from profiles table (including is_verified and role)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('display_name, is_verified, role')
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
        is_verified: profile?.is_verified ?? false,
        role: profile?.role ?? 'user',
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

    // Timeout fallback: If session check takes too long, stop loading
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current && loadingSession) {
        debugLog('[AuthContext] Session check timeout - stopping loading');
        setLoadingSession(false);
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    // Step 1: Check Supabase health before getting session
    checkSupabaseHealth().then(async (health) => {
      if (!health.isOnline) {
        console.warn('[AuthContext] Supabase offline during session check:', health.error);
        clearTimeout(timeoutId);
        if (isMountedRef.current) {
          setIsAuthenticated(false);
          setUser(null);
          setLoadingSession(false);
          setIsLoading(false);
        }
        return null;
      }
      
      // Step 2: Get initial session - ALWAYS use getSession() to get current session
      debugLog('[AuthContext] Calling getSession()...');
      return supabase.auth.getSession();
    }).then(async (result) => {
      if (!result) return; // Health check failed, already handled
      
      const { data: { session }, error } = result;
      clearTimeout(timeoutId);
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
      clearTimeout(timeoutId);
      const normalized = normalizeSupabaseError(error);
      debugLog("[AuthContext] Exception getting session:", normalized);
      
      // Check for network errors
      const errorMessage = error?.message || '';
      const isNetworkError = errorMessage.includes('Failed to fetch') ||
                            errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
                            errorMessage.includes('ERR_NETWORK') ||
                            errorMessage.includes('network') ||
                            error.name === 'TypeError';
      
      if (isNetworkError) {
        console.error('[AuthContext] Network error in session check - clearing health cache');
        clearHealthCheckCache();
      }
      
      if (isMountedRef.current) {
        setLoadingSession(false);
        setIsLoading(false);
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    return () => {
      clearTimeout(timeoutId);
    };

    // Step 2: Listen for auth changes - this keeps state in sync
    // Only set up subscription once
    unsubscribeAuth();
    
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
      unsubscribeAuth();
      isInitializedRef.current = false;
    };
  }, [updateUserFromSession, handleSessionHealthCheck, unsubscribeAuth]);

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
   * Normalizes email (trim + lowercase)
   */
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      debugLog('[AuthContext] signIn start');
      setIsLoading(true);
      
      // Normalize email: trim and lowercase
      const normalizedEmail = email.trim().toLowerCase();
      
      // Clear any stale state first
      setIsAuthenticated(false);
      setUser(null);
      
      // Check Supabase health before attempting login
      const healthCheck = await checkSupabaseHealth();
      if (!healthCheck.isOnline) {
        console.error('[AuthContext] Login blocked - Supabase offline:', healthCheck.error);
        setIsLoading(false);
        return { success: false, error: healthCheck.error || 'Supabase is currently unavailable. Please try again later.' };
      }
      
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
      
      // DEBUG: Log before signIn
      console.log('[AuthContext] signInWithPassword - Before call:', {
        email: normalizedEmail,
        hasPassword: !!password,
        supabaseUrl: typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...') : 'SSR',
        supabaseKeySet: typeof window !== 'undefined' ? !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : false,
      });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        // DEBUG: Log full error details
        console.error('[AuthContext] signInWithPassword - ERROR:', {
          message: error.message,
          status: error.status,
          name: error.name,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint,
          isNetworkError: error.message?.includes('fetch') || error.message?.includes('network'),
        });
        
        const normalized = normalizeSupabaseError(error);
        debugLog('[AuthContext] signIn error:', normalized);
        
        // Check for network errors
        const errorMessage = error.message || '';
        const isNetworkError = errorMessage.includes('Failed to fetch') ||
                              errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
                              errorMessage.includes('ERR_NETWORK') ||
                              errorMessage.includes('network') ||
                              error.name === 'TypeError';
        
        if (isNetworkError) {
          console.error('[AuthContext] Network error detected - clearing health cache');
          clearHealthCheckCache();
          setIsLoading(false);
          return { 
            success: false, 
            error: 'Cannot connect to Supabase. It may be paused, offline, or there is a network issue. Please try again.' 
          };
        }
        
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
        setIsLoading(false);
        return { success: false, error: error.message || 'Invalid email or password. Please try again.' };
      }

      // After successful signIn, always get the current session
      // This ensures we have the latest session data
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // DEBUG: Log session result
      console.log('[AuthContext] signInWithPassword - After getSession:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        sessionError: sessionError?.message,
      });
      
      if (sessionError || !session?.user) {
        const normalized = normalizeSupabaseError(sessionError);
        debugLog('[AuthContext] Error getting session after signIn:', normalized);
        
        if (isAuthError(sessionError)) {
          await handleSessionHealthCheck(sessionError);
        }
        
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return { success: false, error: sessionError?.message || 'Failed to get session after login. Please try again.' };
      }

      // Load user profile from the session
      const userData = await loadUserProfile(session.user);
      if (userData) {
        debugLog('[AuthContext] Profile loaded, setting user state');
        setIsAuthenticated(true);
        setUser(userData);
        setIsLoading(false);
        return { success: true };
      } else {
        debugLog('[AuthContext] Failed to load user profile');
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return { success: false, error: 'Failed to load user profile. Please try again.' };
      }
    } catch (error: any) {
      const normalized = normalizeSupabaseError(error);
      debugLog('[AuthContext] Login exception:', normalized);
      
      // Check for network errors
      const errorMessage = error?.message || '';
      const isNetworkError = errorMessage.includes('Failed to fetch') ||
                            errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
                            errorMessage.includes('ERR_NETWORK') ||
                            errorMessage.includes('network') ||
                            error.name === 'TypeError';
      
      if (isNetworkError) {
        console.error('[AuthContext] Network error in login - clearing health cache');
        clearHealthCheckCache();
        setIsLoading(false);
        return { 
          success: false, 
          error: 'Cannot connect to Supabase. It may be paused, offline, or there is a network issue. Please try again.' 
        };
      }
      
      // Always clear state on exception
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return { success: false, error: error?.message || 'An error occurred. Please try again.' };
    } finally {
      // ALWAYS reset loading state - this is critical
      debugLog('[AuthContext] isLoading reset in finally');
      setIsLoading(false);
    }
  }, [loadUserProfile, handleSessionHealthCheck]);

  /**
   * Register new user with Supabase
   * CRITICAL: Always sets loading=false in finally block
   * Normalizes email (trim + lowercase)
   * Email confirmation ON (most common)
   * Do NOT set isAuthenticated=true unless we receive a session
   */
  const register = async (userData: RegisterData): Promise<{ success: boolean; needsConfirmation?: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      // Normalize email: trim and lowercase
      const normalizedEmail = userData.email.trim().toLowerCase();
      
      // Check Supabase health before attempting signup
      const healthCheck = await checkSupabaseHealth();
      if (!healthCheck.isOnline) {
        console.error('[AuthContext] Signup blocked - Supabase offline:', healthCheck.error);
        setIsLoading(false);
        return { success: false, error: healthCheck.error || 'Supabase is currently unavailable. Please try again later.' };
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: userData.password,
        options: {
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/login?confirmed=true`
            : undefined,
          data: {
            full_name: userData.fullName,
            username: userData.username,
          },
        },
      });

      // DEBUG: Log signup result
      console.log('[AuthContext] signUp result:', {
        hasUser: !!data.user,
        userEmail: data.user?.email,
        emailConfirmed: !!data.user?.email_confirmed_at,
        hasError: !!error,
        errorMessage: error?.message,
        errorCode: (error as any)?.code,
        errorStatus: (error as any)?.status,
      });

      if (error) {
        const normalized = normalizeSupabaseError(error);
        debugLog('[AuthContext] Registration error:', normalized);
        console.error('[AuthContext] Registration error details:', {
          message: error.message,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint,
        });
        
        // Check for network errors
        const errorMessage = error.message || '';
        const isNetworkError = errorMessage.includes('Failed to fetch') ||
                              errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
                              errorMessage.includes('ERR_NETWORK') ||
                              errorMessage.includes('network') ||
                              (error as any).name === 'TypeError';
        
        if (isNetworkError) {
          console.error('[AuthContext] Network error in signup - clearing health cache');
          clearHealthCheckCache();
          setIsLoading(false);
          return { 
            success: false, 
            error: 'Cannot connect to Supabase. It may be paused, offline, or there is a network issue. Please try again.' 
          };
        }
        
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return { success: false, error: error.message || 'Registration failed' };
      }

      // Check if email confirmation is required
      // If user is null but no error, it means email confirmation is required
      if (!data.user && !error) {
        debugLog('[AuthContext] Email confirmation required');
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return { success: false, needsConfirmation: true, error: 'Please check your email to confirm your account' };
      }

      if (data.user) {
        // Check if user email is confirmed
        if (!data.user.email_confirmed_at) {
          debugLog('[AuthContext] User created but email not confirmed');
          setIsAuthenticated(false);
          setUser(null);
          setIsLoading(false);
          return { success: false, needsConfirmation: true, error: 'Please check your email to confirm your account' };
        }

        // Profile will be created automatically by trigger
        // But we can update it with additional info if needed
        const userProfile = await loadUserProfile(data.user);
        if (userProfile) {
          setIsAuthenticated(true);
          setUser(userProfile);
          setIsLoading(false);
          return { success: true };
        }
      }

      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return { success: false, error: 'Registration failed' };
    } catch (error: any) {
      const normalized = normalizeSupabaseError(error);
      debugLog('[AuthContext] Registration exception:', normalized);
      console.error('[AuthContext] Registration exception details:', {
        message: error?.message,
        error,
      });
      
      // Check for network errors
      const errorMessage = error?.message || '';
      const isNetworkError = errorMessage.includes('Failed to fetch') ||
                            errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
                            errorMessage.includes('ERR_NETWORK') ||
                            errorMessage.includes('network') ||
                            error.name === 'TypeError';
      
      if (isNetworkError) {
        console.error('[AuthContext] Network error in registration exception - clearing health cache');
        clearHealthCheckCache();
        setIsLoading(false);
        return { 
          success: false, 
          error: 'Cannot connect to Supabase. It may be paused, offline, or there is a network issue. Please try again.' 
        };
      }
      
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return { success: false, error: error?.message || 'Registration failed' };
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

  /**
   * Resend email confirmation
   */
  const resendConfirmationEmail = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
      });

      if (error) {
        debugLog('[AuthContext] Resend confirmation error:', error);
        return { success: false, error: error.message || 'Failed to resend confirmation email' };
      }

      return { success: true };
    } catch (error: any) {
      debugLog('[AuthContext] Resend confirmation exception:', error);
      return { success: false, error: error?.message || 'Failed to resend confirmation email' };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, loadingSession, login, register, logout, resendConfirmationEmail }}>
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
