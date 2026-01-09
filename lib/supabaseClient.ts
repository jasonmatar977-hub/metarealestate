/**
 * Supabase Client
 * Browser-side Supabase client for authentication and database operations
 * 
 * SECURITY: Uses public anon key - safe for client-side use
 * RLS (Row Level Security) policies protect data on the server
 * 
 * NOTE: This file must only be imported in client components ("use client")
 */

import { createClient } from '@supabase/supabase-js';

// In-memory fallback storage for when localStorage is blocked
const memoryStore = new Map<string, string>();

/**
 * Custom storage adapter that falls back to memory when localStorage is unavailable
 * This handles cases where storage is blocked (e.g., WhatsApp in-app browser)
 */
function createSafeStorageAdapter() {
  // Check if localStorage is available
  let storageAvailable = false;
  if (typeof window !== 'undefined') {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      storageAvailable = true;
    } catch (e) {
      storageAvailable = false;
      console.warn('[Supabase] localStorage is not available, using memory fallback:', e);
    }
  }

  return {
    getItem: (key: string): string | null => {
      if (storageAvailable) {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          // Fall back to memory
          console.warn(`[Supabase] localStorage.getItem failed for "${key}", using memory fallback`);
          return memoryStore.get(key) ?? null;
        }
      }
      return memoryStore.get(key) ?? null;
    },
    setItem: (key: string, value: string): void => {
      if (storageAvailable) {
        try {
          localStorage.setItem(key, value);
          return;
        } catch (error) {
          // Fall back to memory
          console.warn(`[Supabase] localStorage.setItem failed for "${key}", using memory fallback`);
        }
      }
      memoryStore.set(key, value);
    },
    removeItem: (key: string): void => {
      if (storageAvailable) {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`[Supabase] localStorage.removeItem failed for "${key}"`);
        }
      }
      memoryStore.delete(key);
    },
  };
}

// Read environment variables directly (NEXT_PUBLIC_ vars are available in both SSR and client)
// Next.js automatically makes NEXT_PUBLIC_* variables available at build time and runtime
// These are replaced at build time, so they're available as literal strings in the browser
// Access via process.env (which Next.js polyfills for NEXT_PUBLIC_ vars in the browser)
const supabaseUrl = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) || '';
const supabaseAnonKey = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) || '';

// Validate environment variables
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('https://') && !supabaseUrl.includes('placeholder');
const isValidKey = supabaseAnonKey && supabaseAnonKey.length > 20 && !supabaseAnonKey.includes('placeholder');

// Debug log in development (don't print full key)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[Supabase Client] Environment check:', {
    timestamp: new Date().toISOString(),
    urlSet: !!supabaseUrl,
    urlLength: supabaseUrl?.length || 0,
    urlValid: isValidUrl,
    keySet: !!supabaseAnonKey,
    keyLength: supabaseAnonKey?.length || 0,
    keyValid: isValidKey,
    keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'NOT SET'
  });
}

// Create safe storage adapter
const safeStorage = createSafeStorageAdapter();

// Create client - use actual values if valid, otherwise use placeholders for build
// Pass custom storage adapter that falls back to memory when localStorage is blocked
export const supabase = createClient(
  isValidUrl ? supabaseUrl : 'https://placeholder.supabase.co',
  isValidKey ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      storage: safeStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'x-client-info': 'meta-real-estate@1.0.0',
      },
    },
  }
);

// DEBUG: Log client initialization
if (typeof window !== 'undefined') {
  console.log('[Supabase Client] Initialized:', {
    timestamp: new Date().toISOString(),
    urlValid: isValidUrl,
    keyValid: isValidKey,
    urlPreview: isValidUrl ? supabaseUrl.substring(0, 30) + '...' : 'INVALID',
  });
}

// Global 401 handler: Automatically sign out on invalid token errors
// This catches expired/invalid sessions from any Supabase request
if (typeof window !== 'undefined' && isValidUrl && isValidKey) {
  // Store original fetch to restore if needed
  const originalFetch = window.fetch;
  let isHandling401 = false; // Prevent infinite loops
  
  // Intercept fetch only for Supabase requests
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // Check if this is a Supabase request and returned 401
    const url = args[0]?.toString() || '';
    const isSupabaseRequest = url.includes('supabase') || 
                              url.includes(supabaseUrl?.substring(0, 30) || '');
    
    // Skip 401 handling for health check requests (they may return 401 but shouldn't clear auth)
    const isHealthCheckRequest = url.includes('/rest/v1/profiles?select=id&limit=1') || 
                                 url.includes('/rest/v1/');
    
    if (isSupabaseRequest && !isHealthCheckRequest && response.status === 401 && !isHandling401) {
      isHandling401 = true;
      console.warn('[Supabase] 401 Unauthorized detected - session expired');
      
      // Sign out locally and clear storage
      try {
        await supabase.auth.signOut({ scope: 'local' });
        
        // Clear storage keys
        try {
          const allKeys = Object.keys(localStorage);
          allKeys.forEach(key => {
            if (key.startsWith('sb-') || key.includes('supabase.auth.token')) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.error('[Supabase] Error clearing storage:', e);
        }
        
        // Redirect to login with message (only if not already on login page)
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          const currentUrl = new URL(window.location.href);
          currentUrl.pathname = '/login';
          currentUrl.searchParams.set('message', 'Session expired, please log in again.');
          window.location.href = currentUrl.toString();
        }
      } catch (err) {
        console.error('[Supabase] Error during auto signOut:', err);
      } finally {
        // Reset flag after a delay to allow redirect
        setTimeout(() => {
          isHandling401 = false;
        }, 1000);
      }
    }
    
    return response;
  };
}

// Runtime validation and error logging
if (typeof window !== 'undefined') {
  if (!isValidUrl || !isValidKey) {
    console.error('❌ [Supabase] Missing or invalid environment variables:');
    console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `Set (${supabaseUrl.length} chars) but invalid` : 'NOT SET');
    console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? `Set (${supabaseAnonKey.length} chars) but invalid` : 'NOT SET');
    console.error('  Please create .env.local in project root with:');
    console.error('    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    console.error('    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
    console.error('  Then restart the dev server (npm run dev)');
  } else {
    console.log('✅ [Supabase] Client initialized successfully');
    console.log('  URL:', supabaseUrl.substring(0, 30) + '...');
  }
}

// Helper function to check if Supabase is properly configured
// Only check on client-side to avoid SSR issues
export const isSupabaseConfigured = () => {
  if (typeof window === 'undefined') return true; // Assume configured during SSR
  return isValidUrl && isValidKey;
};

// Helper to get validation errors for UI display
// Only runs on client-side to prevent SSR errors
export const getSupabaseConfigError = (): string | null => {
  // Only check on client-side - this prevents SSR from showing config errors
  if (typeof window === 'undefined') return null;
  
  // Read NEXT_PUBLIC_ env vars on client-side
  // These are available in the browser because Next.js injects them at build time
  const clientUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clientKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Dev-only debug: Log env var presence without printing secrets
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Supabase Config Check]', {
      urlPresent: !!clientUrl,
      urlLength: clientUrl?.length || 0,
      urlPreview: clientUrl ? `${clientUrl.substring(0, 20)}...` : 'NOT SET',
      keyPresent: !!clientKey,
      keyLength: clientKey?.length || 0,
      keyPreview: clientKey ? `${clientKey.substring(0, 10)}...` : 'NOT SET',
    });
  }
  
  // Validate URL
  if (!clientUrl || typeof clientUrl !== 'string') {
    return 'NEXT_PUBLIC_SUPABASE_URL is not set. Please create .env.local in project root.';
  }
  
  const clientIsValidUrl = clientUrl.startsWith('https://') && !clientUrl.includes('placeholder');
  if (!clientIsValidUrl) {
    return 'NEXT_PUBLIC_SUPABASE_URL is invalid. Must start with https:// and not be a placeholder.';
  }
  
  // Validate Key
  if (!clientKey || typeof clientKey !== 'string') {
    return 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Please create .env.local in project root.';
  }
  
  const clientIsValidKey = clientKey.length > 20 && !clientKey.includes('placeholder');
  if (!clientIsValidKey) {
    return 'NEXT_PUBLIC_SUPABASE_ANON_KEY is invalid. Must be at least 20 characters and not be a placeholder.';
  }
  
  return null;
};








