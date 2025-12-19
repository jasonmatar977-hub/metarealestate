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

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, getSupabaseConfigError } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, validatePassword, getEmailError, getPasswordError } from "@/lib/validation";

export default function LoginForm() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Check Supabase configuration on mount
  useEffect(() => {
    const error = getSupabaseConfigError();
    if (error) {
      console.error('[LoginForm] Supabase configuration error:', error);
      setConfigError(error);
    }
  }, []);

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
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({}); // Clear previous errors
    
    try {
      // Check Supabase configuration before attempting login
      const configErr = getSupabaseConfigError();
      if (configErr) {
        console.error("[LoginForm] Supabase not configured:", configErr);
        setErrors({ submit: "Supabase is not configured. Please check your environment variables." });
        setIsLoading(false);
        return;
      }

      console.log("[LoginForm] Attempting login...");
      
      // Use AuthContext login function which handles state updates
      const success = await login(formData.email, formData.password);

      if (success) {
        // Success - wait a moment for auth state to update, then redirect
        console.log("[LoginForm] Login successful, redirecting to /feed...");
        // Small delay to ensure auth state is updated
        setTimeout(() => {
          router.push("/feed");
        }, 100);
      } else {
        console.error("[LoginForm] Login failed");
        setErrors({ submit: "Invalid email or password. Please try again." });
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("[LoginForm] Login exception:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      });
      
      // Handle network/fetch errors
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('fetch') || error?.name === 'TypeError') {
        setErrors({ submit: "Network error: Cannot connect to Supabase. Please check your .env.local file and restart the dev server." });
      } else {
        setErrors({ submit: error?.message || "An error occurred. Please try again." });
      }
      setIsLoading(false);
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
              disabled={isLoading || authLoading}
              className="w-full px-8 py-4 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || authLoading ? "Signing in..." : "Sign In"}
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
    </div>
  );
}

