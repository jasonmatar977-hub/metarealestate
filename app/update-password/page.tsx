"use client";

/**
 * Update Password Page
 * Route: /update-password
 * User sets new password after clicking reset link
 */

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";

function UpdatePasswordForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    // Check if user has a valid session (from reset link)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      } else {
        setError("Invalid or expired reset link. Please request a new password reset.");
      }
    };
    checkSession();
  }, []);

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
    try {
      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || "Failed to update password. Please try again.");
      } else {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidSession && !error) {
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
                    <p className="text-red-600 text-sm text-center">{error}</p>
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
