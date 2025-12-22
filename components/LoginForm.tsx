"use client";

/**
 * Login Form Component
 * Handles user login with email and password validation
 * 
 * SECURITY NOTE: This is front-end validation only.
 * Real authentication must be implemented on the backend with:
 * - Password hashing verification
 * - Rate limiting
 * - CSRF protection
 * - Secure session management
 */

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, getSupabaseConfigError } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, validatePassword, getEmailError, getPasswordError } from "@/lib/validation";

// Auth Debug Component (dev only)
function AuthDebug() {
  const { isAuthenticated, user, isLoading, loadingSession } = useAuth();
  const [showDebug, setShowDebug] = useState(false);
  const [authState, setAuthState] = useState<any>(null);

  useEffect(() => {
    if (showDebug) {
      const updateAuthState = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setAuthState({
          hasSession: !!session,
          sessionUserId: session?.user?.id,
          getUserResult: authUser ? { id: authUser.id, email: authUser.email } : null,
          sessionExpiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        });
      };
      updateAuthState();
      const interval = setInterval(updateAuthState, 2000);
      return () => clearInterval(interval);
    }
  }, [showDebug]);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="px-3 py-2 bg-gray-800 text-white text-xs rounded-lg hover:bg-gray-700"
      >
        {showDebug ? 'Hide' : 'Show'} Auth Debug
      </button>
      {showDebug && (
        <div className="mt-2 p-4 bg-gray-900 text-white text-xs rounded-lg max-w-sm">
          <div className="mb-2 font-bold">Auth State:</div>
          <div>isAuthenticated: {String(isAuthenticated)}</div>
          <div>isLoading: {String(isLoading)}</div>
          <div>loadingSession: {String(loadingSession)}</div>
          <div>user: {user ? `${user.id} (${user.email})` : 'null'}</div>
          {authState && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="font-bold">Session:</div>
              <div>hasSession: {String(authState.hasSession)}</div>
              <div>sessionUserId: {authState.sessionUserId || 'null'}</div>
              <div>getUser: {authState.getUserResult ? `${authState.getUserResult.id}` : 'null'}</div>
              <div>expires: {authState.sessionExpiresAt || 'null'}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: authLoading, loadingSession } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false); // Separate state for form submission only
  const [checkingSession, setCheckingSession] = useState(true); // Separate state for session check
  const [configError, setConfigError] = useState<string | null>(null);
  const hasRedirectedRef = useRef(false); // Prevent multiple redirects

  // Hard reset all state on mount
  useEffect(() => {
    console.log('[LoginForm] Component mounted - hard resetting state');
    setIsSubmitting(false);
    setErrors({});
    setCheckingSession(true);
    hasRedirectedRef.current = false;
    
    // Check for message from query params (e.g., "Session expired")
    const message = searchParams.get('message');
    if (message) {
      setErrors({ submit: message });
      // Clear the message from URL
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, router]);

  // Check Supabase configuration on mount
  useEffect(() => {
    const error = getSupabaseConfigError();
    if (error) {
      console.error('[LoginForm] Supabase configuration error:', error);
      setConfigError(error);
    }
  }, []);

  // Check session and redirect if already authenticated (separate from form submission)
  useEffect(() => {
    // Wait for AuthContext to finish loading session
    if (loadingSession || authLoading) {
      console.log('[LoginForm] Waiting for session check to complete...');
      return;
    }

    console.log('[LoginForm] Session check complete:', { isAuthenticated, hasRedirected: hasRedirectedRef.current });

    // If user is already authenticated, redirect cleanly WITHOUT setting isSubmitting
    if (isAuthenticated && !hasRedirectedRef.current) {
      console.log('[LoginForm] User already authenticated, redirecting to /feed (clean redirect, no loading state)');
      hasRedirectedRef.current = true;
      setCheckingSession(false);
      router.push("/feed");
      return;
    }

    // Session check complete, user is not authenticated
    setCheckingSession(false);
  }, [isAuthenticated, loadingSession, authLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LoginForm] Form submit started');

    // Hard reset errors on new submit attempt
    setErrors({});

    const newErrors: Record<string, string> = {};

    // Validate email
    const emailError = getEmailError(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    // Validate password
    const passwordError = getPasswordError(formData.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    if (Object.keys(newErrors).length > 0) {
      console.log('[LoginForm] Validation errors, not submitting');
      setErrors(newErrors);
      setIsSubmitting(false); // Ensure loading is false on early return
      return;
    }

    // Set submitting state ONLY when actually submitting
    console.log('[LoginForm] signIn start');
    setIsSubmitting(true);
    setErrors({}); // Clear previous errors
    
    try {
      // Check Supabase configuration before attempting login
      const configErr = getSupabaseConfigError();
      if (configErr) {
        console.error("[LoginForm] Supabase not configured:", configErr);
        setErrors({ submit: "Supabase is not configured. Please check your environment variables." });
        setIsSubmitting(false);
        return;
      }

      // Use AuthContext login function which handles state updates
      const success = await login(formData.email, formData.password);

      if (success) {
        // Success - wait a moment for auth state to update, then redirect
        // Small delay to ensure auth state is updated
        setTimeout(() => {
          router.push("/feed");
        }, 100);
      } else {
        // Login failed - get actual error from Supabase
        // The error should already be logged above, but we need to show it to user
        // Check if we can get more details from the login function
        const { data: { session }, error: checkError } = await supabase.auth.getSession();
        if (checkError) {
          console.error('[LoginForm] Additional error after failed login:', checkError);
        }
        
        // Show actual error message if available, otherwise generic
        setErrors({ submit: "Invalid email or password. Please try again." });
        // Do NOT redirect on error - user should be able to retry
      }
    } catch (error: any) {
      // Handle network/fetch errors
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('fetch') || error?.name === 'TypeError') {
        setErrors({ submit: "Network error: Cannot connect to Supabase. Please check your .env.local file and restart the dev server." });
      } else if (error?.message?.includes('Invalid login') || error?.message?.includes('credentials')) {
        setErrors({ submit: "Invalid email or password. Please try again." });
      } else {
        // For other errors, show user-friendly message
        const errorMessage = error?.message || "An error occurred. Please try again.";
        setErrors({ submit: errorMessage });
      }
      // Do NOT redirect on error - user should be able to retry
    } finally {
      // ALWAYS reset submitting state - this is critical to prevent stuck UI
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-20">
      <div className="w-full max-w-md">
        <div className="glass-dark rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl">
          <h1 className="font-orbitron text-3xl md:text-4xl font-bold text-center mb-2 text-gold-dark">
            Welcome Back
          </h1>
          <p className="text-center text-gray-600 mb-8">Sign in to your account</p>

          {/* Supabase Configuration Error */}
          {configError && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-xl">
              <p className="text-red-600 text-sm font-semibold mb-2">⚠️ Configuration Error</p>
              <p className="text-red-600 text-sm">{configError}</p>
              <p className="text-red-600 text-xs mt-2">
                Please create <code className="bg-red-100 px-1 rounded">.env.local</code> in your project root with your Supabase credentials.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl border-2 ${
                  errors.email ? "border-red-500" : "border-gold/40"
                } focus:border-gold focus:outline-none transition-colors`}
                placeholder="your.email@example.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl border-2 ${
                  errors.password ? "border-red-500" : "border-gold/40"
                } focus:border-gold focus:outline-none transition-colors`}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <div className="text-right">
              <Link
                href="/reset-password"
                className="text-sm text-gold hover:text-gold-dark font-semibold"
              >
                Forgot password?
              </Link>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4">
                <p className="text-red-600 text-sm text-center">{errors.submit}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-8 py-4 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Don't have an account?{" "}
            <a href="/register" className="text-gold hover:text-gold-dark font-semibold">
              Create Account
            </a>
          </p>
        </div>
      </div>
      <AuthDebug />
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-20">
        <div className="w-full max-w-md">
          <div className="glass-dark rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl">
            <h1 className="font-orbitron text-3xl md:text-4xl font-bold text-center mb-2 text-gold-dark">
              Welcome Back
            </h1>
            <p className="text-center text-gray-600 mb-8">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}

