/**
 * Validation utilities for form inputs
 * 
 * SECURITY NOTE: These are front-end validations for UX only.
 * All inputs must be validated again on the backend for real security.
 */

/**
 * Validates email format
 * @param email - Email string to validate
 * @returns true if valid email format, false otherwise
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates password strength
 * @param password - Password string to validate
 * @param minLength - Minimum length required (default: 8)
 * @returns true if password meets requirements, false otherwise
 */
export function validatePassword(password: string, minLength: number = 8): boolean {
  if (!password || typeof password !== 'string') return false;
  return password.length >= minLength;
}

/**
 * Validates that password and confirm password match
 * @param password - Original password
 * @param confirmPassword - Confirmation password
 * @returns true if passwords match, false otherwise
 */
export function validatePasswordMatch(password: string, confirmPassword: string): boolean {
  if (!password || !confirmPassword) return false;
  return password === confirmPassword;
}

/**
 * Validates username format
 * @param username - Username string to validate
 * @returns true if valid username format, false otherwise
 */
export function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  // Username: 3-20 chars, alphanumeric and underscore only, no spaces
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(trimmed);
}

/**
 * Validates full name
 * @param name - Full name string to validate
 * @returns true if valid name format, false otherwise
 */
export function validateFullName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  // Name: 2-50 chars, letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Z\s'-]{2,50}$/;
  return nameRegex.test(trimmed);
}

/**
 * Validates date is in the past
 * @param dateString - Date string to validate
 * @returns true if date is valid and in the past, false otherwise
 */
export function validatePastDate(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Validates non-empty string
 * @param value - String to validate
 * @returns true if non-empty, false otherwise
 */
export function validateRequired(value: string): boolean {
  return value !== null && value !== undefined && value.trim().length > 0;
}

/**
 * Gets email validation error message
 */
export function getEmailError(email: string): string | null {
  if (!email) return "Email is required";
  if (!validateEmail(email)) return "Please enter a valid email address";
  return null;
}

/**
 * Gets password validation error message
 */
export function getPasswordError(password: string): string | null {
  if (!password) return "Password is required";
  if (!validatePassword(password)) return "Password must be at least 8 characters";
  return null;
}

/**
 * Gets username validation error message
 */
export function getUsernameError(username: string): string | null {
  if (!username) return "Username is required";
  if (!validateUsername(username)) return "Username must be 3-20 characters, alphanumeric and underscore only";
  return null;
}

/**
 * Gets full name validation error message
 */
export function getFullNameError(name: string): string | null {
  if (!name) return "Full name is required";
  if (!validateFullName(name)) return "Please enter a valid name (2-50 characters)";
  return null;
}

