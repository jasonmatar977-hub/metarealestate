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

// Read environment variables directly (NEXT_PUBLIC_ vars are available in both SSR and client)
// Next.js automatically makes NEXT_PUBLIC_* variables available at build time and runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate environment variables
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('https://') && !supabaseUrl.includes('placeholder');
const isValidKey = supabaseAnonKey && supabaseAnonKey.length > 20 && !supabaseAnonKey.includes('placeholder');

// Debug log in development (don't print full key)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[Supabase Client] Environment check:', {
    urlSet: !!supabaseUrl,
    urlLength: supabaseUrl?.length || 0,
    urlValid: isValidUrl,
    keySet: !!supabaseAnonKey,
    keyLength: supabaseAnonKey?.length || 0,
    keyValid: isValidKey,
    keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'NOT SET'
  });
}

// Create client - use actual values if valid, otherwise use placeholders for build
export const supabase = createClient(
  isValidUrl ? supabaseUrl : 'https://placeholder.supabase.co',
  isValidKey ? supabaseAnonKey : 'placeholder-key'
);

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
  
  // Re-read env vars on client-side to ensure we have the latest values
  const clientUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const clientKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  const clientIsValidUrl = clientUrl && clientUrl.startsWith('https://') && !clientUrl.includes('placeholder');
  const clientIsValidKey = clientKey && clientKey.length > 20 && !clientKey.includes('placeholder');
  
  if (!clientUrl) {
    return 'NEXT_PUBLIC_SUPABASE_URL is not set. Please create .env.local in project root.';
  }
  if (!clientIsValidUrl) {
    return 'NEXT_PUBLIC_SUPABASE_URL is invalid. Must start with https://';
  }
  if (!clientKey) {
    return 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Please create .env.local in project root.';
  }
  if (!clientIsValidKey) {
    return 'NEXT_PUBLIC_SUPABASE_ANON_KEY is invalid.';
  }
  return null;
};








