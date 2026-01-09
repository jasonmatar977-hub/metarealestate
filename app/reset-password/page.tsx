"use client";

/**
 * Reset Password Page
 * Route: /reset-password
 * User enters email to receive password reset link
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";
import { checkSupabaseHealth, clearHealthCheckCache } from "@/lib/supabaseHealth";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Check Supabase health first
      const healthCheck = await checkSupabaseHealth();
      if (!healthCheck.isOnline) {
        console.error('[ResetPassword] Supabase offline:', healthCheck.error);
        setIsLoading(false);
        setError(healthCheck.error || 'Supabase is currently unavailable. Please try again later.');
        return;
      }
      
      const normalizedEmail = email.trim().toLowerCase();
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}/update-password`
        : '/update-password';
      
      // DEBUG: Log before reset
      console.log('[ResetPassword] resetPasswordForEmail - Before call:', {
        email: normalizedEmail,
        redirectTo,
        origin: typeof window !== 'undefined' ? window.location.origin : 'SSR',
        supabaseUrl: typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...') : 'SSR',
      });
      
      // Use Supabase password reset
      // IMPORTANT: redirectTo must match Supabase dashboard redirect URLs
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });
      
      // DEBUG: Log result
      console.log('[ResetPassword] resetPasswordForEmail - Result:', {
        hasError: !!resetError,
        errorMessage: resetError?.message,
        errorCode: (resetError as any)?.code,
        errorStatus: (resetError as any)?.status,
      });

      if (resetError) {
        console.error('[ResetPassword] resetPasswordForEmail - ERROR:', {
          message: resetError.message,
          code: (resetError as any).code,
          status: (resetError as any).status,
          details: (resetError as any).details,
          hint: (resetError as any).hint,
        });
        
        // Check for network errors
        const errorMessage = resetError.message || '';
        const isNetworkError = errorMessage.includes('Failed to fetch') ||
                              errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
                              errorMessage.includes('ERR_NETWORK') ||
                              errorMessage.includes('network') ||
                              (resetError as any).name === 'TypeError';
        
        if (isNetworkError) {
          console.error('[ResetPassword] Network error - clearing health cache');
          clearHealthCheckCache();
          setError('Cannot connect to Supabase. It may be paused, offline, or there is a network issue. Please try again.');
        } else {
          setError(resetError.message || "Failed to send reset email. Please try again.");
        }
      } else {
        console.log('[ResetPassword] resetPasswordForEmail - SUCCESS');
        setSuccess(true);
      }
    } catch (err: any) {
      console.error('[ResetPassword] resetPasswordForEmail - EXCEPTION:', err);
      
      // Check for network errors
      const errorMessage = err?.message || '';
      const isNetworkError = errorMessage.includes('Failed to fetch') ||
                            errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
                            errorMessage.includes('ERR_NETWORK') ||
                            errorMessage.includes('network') ||
                            err.name === 'TypeError';
      
      if (isNetworkError) {
        console.error('[ResetPassword] Network error in exception - clearing health cache');
        clearHealthCheckCache();
        setError('Cannot connect to Supabase. It may be paused, offline, or there is a network issue. Please try again.');
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-20">
        <div className="w-full max-w-md">
          <div className="glass-dark rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl">
            <h1 className="font-orbitron text-3xl md:text-4xl font-bold text-center mb-2 text-gold-dark">
              Reset Password
            </h1>
            <p className="text-center text-gray-600 mb-8">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {success ? (
              <div className="space-y-4">
                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4">
                  <p className="text-green-600 text-sm text-center">
                    Password reset email sent! Please check your inbox and follow the instructions.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="block w-full text-center px-8 py-4 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-xl transition-all"
                >
                  Back to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gold/40 focus:border-gold focus:outline-none transition-colors"
                    placeholder="your.email@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4">
                    <p className="text-red-600 text-sm text-center mb-3">{error}</p>
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
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                      >
                        {isRetrying ? "Retrying..." : "Retry"}
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-8 py-4 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}

            <p className="text-center text-gray-600 mt-6">
              Remember your password?{" "}
              <Link href="/login" className="text-gold hover:text-gold-dark font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
















