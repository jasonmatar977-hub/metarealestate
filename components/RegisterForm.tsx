"use client";

/**
 * Register Form Component
 * Handles new user registration with comprehensive validation
 * 
 * SECURITY NOTE: This is front-end validation only.
 * Real registration must be implemented on the backend with:
 * - Server-side validation of all fields
 * - Password hashing (bcrypt, argon2)
 * - Email verification
 * - Rate limiting to prevent abuse
 * - CSRF protection
 * - Input sanitization
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateUsername,
  validateFullName,
  validatePastDate,
  validateRequired,
  getEmailError,
  getPasswordError,
  getUsernameError,
  getFullNameError,
} from "@/lib/validation";

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Japan",
  "Lebanon",
  "Other",
];

export default function RegisterForm() {
  const router = useRouter();
  const { register, resendConfirmationEmail } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    address: "",
    country: "",
    birthday: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string | boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate full name
    const fullNameError = getFullNameError(formData.fullName);
    if (fullNameError) {
      newErrors.fullName = fullNameError;
    }

    // Validate username
    const usernameError = getUsernameError(formData.username);
    if (usernameError) {
      newErrors.username = usernameError;
    }

    // Validate email
    const emailError = getEmailError(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    // Validate address
    if (!validateRequired(formData.address)) {
      newErrors.address = "Address is required";
    }

    // Validate country
    if (!validateRequired(formData.country)) {
      newErrors.country = "Country is required";
    }

    // Validate birthday
    if (!validateRequired(formData.birthday)) {
      newErrors.birthday = "Birthday is required";
    } else if (!validatePastDate(formData.birthday)) {
      newErrors.birthday = "Birthday must be a valid date in the past";
    }

    // Validate password
    const passwordError = getPasswordError(formData.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    // Validate password match
    if (!validatePasswordMatch(formData.password, formData.confirmPassword)) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Validate terms agreement
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms and conditions";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      // Normalize email before registration
      const normalizedEmail = formData.email.trim().toLowerCase();
      
      // SECURITY: In production, this should call a backend API
      // that validates, sanitizes, and securely stores user data
      const result = await register({
        fullName: formData.fullName,
        username: formData.username,
        email: normalizedEmail,
        address: formData.address,
        country: formData.country,
        birthday: formData.birthday,
        password: formData.password, // Backend must hash this!
      });

      if (result.success) {
        router.push("/listings");
      } else if (result.needsConfirmation) {
        // Show email confirmation message
        setErrors({ 
          submit: result.error || "Please check your email to confirm your account before logging in.",
          needsConfirmation: true,
          email: normalizedEmail
        });
      } else {
        setErrors({ submit: result.error || "Registration failed. Please try again." });
      }
    } catch (error: any) {
      setErrors({ submit: error?.message || "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-20">
      <div className="w-full max-w-2xl">
        <div className="glass-dark rounded-3xl p-8 md:p-12 shadow-2xl">
          <h1 className="font-orbitron text-3xl md:text-4xl font-bold text-center mb-2 text-gold-dark">
            Create Account
          </h1>
          <p className="text-center text-gray-600 mb-8">Join Meta Real Estate today</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border-2 ${
                    errors.fullName ? "border-red-500" : "border-gold/40"
                  } focus:border-gold focus:outline-none transition-colors`}
                  placeholder="John Doe"
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border-2 ${
                    errors.username ? "border-red-500" : "border-gold/40"
                  } focus:border-gold focus:outline-none transition-colors`}
                  placeholder="johndoe"
                />
                {errors.username && (
                  <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address *
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
              <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl border-2 ${
                  errors.address ? "border-red-500" : "border-gold/40"
                } focus:border-gold focus:outline-none transition-colors`}
                placeholder="123 Main St, City, State"
              />
              {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-2">
                  Country *
                </label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border-2 ${
                    errors.country ? "border-red-500" : "border-gold/40"
                  } focus:border-gold focus:outline-none transition-colors`}
                >
                  <option value="">Select a country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                {errors.country && (
                  <p className="text-red-500 text-sm mt-1">{errors.country}</p>
                )}
              </div>

              <div>
                <label htmlFor="birthday" className="block text-sm font-semibold text-gray-700 mb-2">
                  Birthday *
                </label>
                <input
                  type="date"
                  id="birthday"
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border-2 ${
                    errors.birthday ? "border-red-500" : "border-gold/40"
                  } focus:border-gold focus:outline-none transition-colors`}
                />
                {errors.birthday && (
                  <p className="text-red-500 text-sm mt-1">{errors.birthday}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password *
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
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border-2 ${
                    errors.confirmPassword ? "border-red-500" : "border-gold/40"
                  } focus:border-gold focus:outline-none transition-colors`}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div>
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 rounded border-gold text-gold focus:ring-gold"
                />
                <span className="text-sm text-gray-700">
                  I have read and agree to the{" "}
                  <a href="#" className="text-gold hover:text-gold-dark font-semibold">
                    terms and conditions
                  </a>{" "}
                  *
                </span>
              </label>
              {errors.agreeToTerms && (
                <p className="text-red-500 text-sm mt-1">{errors.agreeToTerms}</p>
              )}
            </div>

            {errors.submit && (
              <div className={`border-2 rounded-xl p-4 ${
                errors.needsConfirmation 
                  ? "bg-blue-50 border-blue-500" 
                  : "bg-red-50 border-red-500"
              }`}>
                <p className={`text-sm text-center mb-3 ${
                  errors.needsConfirmation ? "text-blue-600" : "text-red-600"
                }`}>
                  {errors.submit}
                </p>
                {!errors.needsConfirmation && typeof errors.submit === 'string' && (errors.submit.includes('unavailable') || errors.submit.includes('Cannot connect') || errors.submit.includes('network')) && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsRetrying(true);
                      setErrors({});
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
                {errors.needsConfirmation && errors.email && (
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsResending(true);
                        const result = await resendConfirmationEmail(errors.email as string);
                        if (result.success) {
                          setErrors((prev) => ({
                            ...prev,
                            submit: "Confirmation email sent! Please check your inbox.",
                          }));
                        } else {
                          setErrors((prev) => ({
                            ...prev,
                            submit: result.error || "Failed to resend email. Please try again.",
                          }));
                        }
                        setIsResending(false);
                      }}
                      disabled={isResending}
                      className="text-sm text-blue-600 hover:text-blue-800 font-semibold underline disabled:opacity-50"
                    >
                      {isResending ? "Sending..." : "Resend confirmation email"}
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-8 py-4 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-gold hover:text-gold-dark font-semibold">
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
