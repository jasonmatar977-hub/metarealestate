/**
 * Supabase Client
 * Browser-side Supabase client for authentication and database operations
 * 
 * SECURITY: Uses public anon key - safe for client-side use
 * RLS (Row Level Security) policies protect data on the server
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate environment variables
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('https://') && !supabaseUrl.includes('placeholder');
const isValidKey = supabaseAnonKey && supabaseAnonKey.length > 20 && !supabaseAnonKey.includes('placeholder');

// Create client - use actual values if valid, otherwise use placeholders for build
export const supabase = createClient(
  isValidUrl ? supabaseUrl : 'https://placeholder.supabase.co',
  isValidKey ? supabaseAnonKey : 'placeholder-key'
);

// Log validation status at runtime
if (typeof window !== 'undefined') {
  if (!isValidUrl || !isValidKey) {
    console.error('⚠️ Missing or invalid Supabase environment variables:');
    console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set but invalid' : 'NOT SET');
    console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set but invalid' : 'NOT SET');
    console.error('Please set these in Vercel Environment Variables for the app to work.');
  } else {
    console.log('✅ Supabase client initialized successfully');
  }
}

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return isValidUrl && isValidKey;
};








