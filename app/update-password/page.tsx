"use client";

/**
 * Update Password Page
 * Route: /update-password
 * User sets new password after clicking reset link from Supabase email
 * 
 * Handles Supabase recovery token from URL hash (#access_token=...)
 */

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { checkSupabaseHealth, clearHealthCheckCache } from "@/lib/supabaseHealth";

function UpdatePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Handle password reset recovery token from URL
    const handleRecovery = async () => {
      // DEBUG: Log initial state
      console.log('[UpdatePassword] handleRecovery - Starting:', {
        hash: window.location.hash?.substring(0, 50) + '...',
        search: window.location.search,
      });
      
      try {
        setIsCheckingSession(true);
        
        // Supabase recovery links come in URL hash: #access_token=...&type=recovery&...
        // We need to check both the hash and query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryType = searchParams.get('type');
        const hashType = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        console.log('[UpdatePassword] Checking recovery token:', {
          hasHash: !!window.location.hash,
          hashType,
          queryType,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        });

        // Check if this is a recovery flow
        if ((hashType === 'recovery' || queryType === 'recovery') && accessToken) {
          console.log('[UpdatePassword] Recovery token detected, establishing session...');
          
          // DEBUG: Log token details (safe - no secrets)
          console.log('[UpdatePassword] Recovery token details:', {
            hashType,
            queryType,
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            accessTokenLength: accessToken?.length,
          });
          
          // Supabase should automatically handle the hash, but we can also manually set the session
          // First, try to get the current session (Supabase may have already processed the hash)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (session && session.user) {
            console.log('[UpdatePassword] Session established from recovery token');
            setIsValidSession(true);
            setIsCheckingSession(false);
            return;
          }
          
          // If no session yet, try to set it manually using the tokens from hash
          if (accessToken && refreshToken) {
            console.log('[UpdatePassword] Setting session from recovery tokens...');
            const { data: { session: newSession }, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (setSessionError) {
              console.error('[UpdatePassword] Error setting session:', setSessionError);
              setError("Invalid or expired reset link. Please request a new password reset.");
              setIsCheckingSession(false);
              return;
            }
            
            if (newSession && newSession.user) {
              console.log('[UpdatePassword] Session established manually');
              setIsValidSession(true);
              setIsCheckingSession(false);
              return;
            }
          }
          
          // If we still don't have a session, the token might be invalid
          setError("Invalid or expired reset link. Please request a new password reset.");
          setIsCheckingSession(false);
          return;
        }

        // Check if we already have a valid session (user might have refreshed the page)
        const { data: { session: existingSession }, error: existingError } = await supabase.auth.getSession();
        
        if (existingSession && existingSession.user) {
          console.log('[UpdatePassword] Existing session found');
          setIsValidSession(true);
          setIsCheckingSession(false);
          return;
        }

        // No valid session or recovery token
        console.error('[UpdatePassword] No valid session or recovery token found');
        setError("Invalid or expired reset link. Please request a new password reset.");
        setIsCheckingSession(false);
      } catch (err: any) {
        console.error('[UpdatePassword] Error checking session:', err);
        setError("An error occurred. Please request a new password reset.");
        setIsCheckingSession(false);
      }
    };
    
    // Only run on client side
    if (typeof window !== 'undefined') {
      handleRecovery();
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Check Supabase health first
      const healthCheck = await checkSupabaseHealth();
      if (!healthCheck.isOnline) {
        console.error('[UpdatePassword] Supabase offline:', healthCheck.error);
        setIsLoading(false);
        setError(healthCheck.error || 'Supabase is currently unavailable. Please try again later.');
        return;
      }
      
      // Verify we still have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.user) {
        setError("Your session has expired. Please request a new password reset link.");
        setIsLoading(false);
        return;
      }

      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });
      
      // DEBUG: Log update result
      console.log('[UpdatePassword] updateUser - Result:', {
        hasError: !!updateError,
        errorMessage: updateError?.message,
        errorCode: (updateError as any)?.code,
      });

      if (updateError) {
        console.error('[UpdatePassword] Error updating password:', updateError);
        
        // Check for network errors
        const errorMessage = updateError.message || '';
        const isNetworkError = errorMessage.includes('Failed to fetch') ||
                              errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
                              errorMessage.includes('ERR_NETWORK') ||
                              errorMessage.includes('network') ||
                              (updateError as any).name === 'TypeError';
        
        if (isNetworkError) {
          console.error('[UpdatePassword] Network error - clearing health cache');
          clearHealthCheckCache();
          setError('Cannot connect to Supabase. It may be paused, offline, or there is a network issue. Please try again.');
        } else {
          setError(updateError.message || "Failed to update password. Please try again.");
        }
      } else {
        setSuccess(true);
        // Redirect to login with success message after 2 seconds
        setTimeout(() => {
          router.push("/login?message=Password updated successfully. Please log in with your new password.");
        }, 2000);
      }
    } catch (err: any) {
      console.error('[UpdatePassword] Exception updating password:', err);
      
      // Check for network errors
      const errorMessage = err?.message || '';
      const isNetworkError = errorMessage.includes('Failed to fetch') ||
                            errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
                            errorMessage.includes('ERR_NETWORK') ||
                            errorMessage.includes('network') ||
                            err.name === 'TypeError';
      
      if (isNetworkError) {
        console.error('[UpdatePassword] Network error in exception - clearing health cache');
        clearHealthCheckCache();
        setError('Cannot connect to Supabase. It may be paused, offline, or there is a network issue. Please try again.');
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying reset link...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-20">
        <div className="w-full max-w-md">
          <div className="glass-dark rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl">
            <h1 className="font-orbitron text-3xl md:text-4xl font-bold text-center mb-2 text-gold-dark">
              Set New Password
            </h1>
            <p className="text-center text-gray-600 mb-8">
              Enter your new password below.
            </p>

            {success ? (
              <div className="space-y-4">
                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4">
                  <p className="text-green-600 text-sm text-center">
                    Password updated successfully! Redirecting to login...
                  </p>
                </div>
                <Link
                  href="/login"
                  className="block w-full text-center px-8 py-4 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-xl transition-all"
                >
                  Go to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none transition-colors"
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none transition-colors"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4">
                    <p className="text-red-600 text-sm text-center mb-3">{error}</p>
                    {error.includes("expired") && (
                      <Link
                        href="/reset-password"
                        className="block text-center mt-2 text-red-600 hover:text-red-800 text-sm font-semibold underline"
                      >
                        Request a new reset link
                      </Link>
                    )}
                    {(error.includes('unavailable') || error.includes('Cannot connect') || error.includes('network')) && (
                      <button
                        type="button"
                        onClick={async () => {
                          setIsRetrying(true);
                          clearHealthCheckCache();
                          const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
                          await handleSubmit(syntheticEvent);
                          setIsRetrying(false);
                        }}
                        disabled={isRetrying || isLoading}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold mt-2"
                      >
                        {isRetrying ? "Retrying..." : "Retry"}
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !isValidSession}
                  className="w-full px-8 py-4 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}

            <p className="text-center text-gray-600 mt-6">
              <Link href="/login" className="text-gold hover:text-gold-dark font-semibold">
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen">
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </main>
    }>
      <UpdatePasswordForm />
    </Suspense>
  );
}
