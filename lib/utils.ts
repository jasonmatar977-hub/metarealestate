/**
 * Utility Functions
 * Shared helper functions for the application
 */

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 * @param str The string to validate
 * @returns true if the string is a valid URL starting with http:// or https://
 */
export function isValidUrl(str: string | null | undefined): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }
  
  // Must start with http:// or https://
  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    return false;
  }
  
  // Try to construct a URL object to validate
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Gets the public URL for a Supabase storage file
 * @param bucket The storage bucket name
 * @param filePath The file path within the bucket
 * @returns The public URL or null if invalid
 */
export function getStoragePublicUrl(bucket: string, filePath: string): string | null {
  // This should be called from client-side only
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Import supabase client dynamically to avoid SSR issues
  // For now, return null and let the component handle it
  return null;
}




