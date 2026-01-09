/**
 * Supabase Health Check Utility
 * Checks if Supabase is online and reachable before attempting auth operations
 * 
 * Uses AbortController for timeout to prevent infinite loading
 * Uses public REST endpoint (doesn't require authentication)
 */

const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
const HEALTH_CHECK_CACHE_DURATION = 30000; // Cache result for 30 seconds

interface HealthCheckResult {
  isOnline: boolean;
  error?: string;
  timestamp: number;
}

let cachedHealthCheck: HealthCheckResult | null = null;

/**
 * Check if Supabase is online by pinging a public REST endpoint
 * Uses AbortController for timeout
 * Caches result for 30 seconds to avoid excessive requests
 * 
 * NOTE: Does NOT use /auth/v1/health (requires auth, returns 401)
 * Uses /rest/v1/profiles?select=id&limit=1 (public endpoint with anon key)
 */
export async function checkSupabaseHealth(): Promise<HealthCheckResult> {
  // Return cached result if still valid
  if (cachedHealthCheck && Date.now() - cachedHealthCheck.timestamp < HEALTH_CHECK_CACHE_DURATION) {
    return cachedHealthCheck;
  }

  const supabaseUrl = typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_SUPABASE_URL 
    : '';
  const supabaseAnonKey = typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : '';

  // Check if env vars are missing
  if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
    const result: HealthCheckResult = {
      isOnline: false,
      error: 'Supabase config missing: NEXT_PUBLIC_SUPABASE_URL is not set',
      timestamp: Date.now(),
    };
    cachedHealthCheck = result;
    return result;
  }

  if (!supabaseAnonKey || supabaseAnonKey.length < 20) {
    const result: HealthCheckResult = {
      isOnline: false,
      error: 'Supabase config missing: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set',
      timestamp: Date.now(),
    };
    cachedHealthCheck = result;
    return result;
  }

  // Use public REST endpoint (doesn't require authentication)
  // This endpoint is accessible with just the anon key
  const healthUrl = `${supabaseUrl}/rest/v1/profiles?select=id&limit=1`;
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Prefer': 'return=minimal',
      },
    });

    clearTimeout(timeoutId);

    // Accept 200 (success) or 406 (not acceptable, but service is reachable)
    // Also accept 401/403 if RLS blocks, but service is online
    // The key is: if we get ANY response (not a network error), Supabase is online
    if (response.status === 200 || response.status === 406 || response.status === 401 || response.status === 403) {
      const result: HealthCheckResult = {
        isOnline: true,
        timestamp: Date.now(),
      };
      cachedHealthCheck = result;
      return result;
    } else if (response.status >= 500) {
      // Server errors mean Supabase is having issues
      const result: HealthCheckResult = {
        isOnline: false,
        error: `Supabase server error (${response.status}). It may be paused or experiencing issues.`,
        timestamp: Date.now(),
      };
      cachedHealthCheck = result;
      return result;
    } else {
      // Other status codes - service is reachable but something else is wrong
      // For health check purposes, if we got a response, service is online
      const result: HealthCheckResult = {
        isOnline: true,
        timestamp: Date.now(),
      };
      cachedHealthCheck = result;
      return result;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Check if it's a timeout/abort error
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      const result: HealthCheckResult = {
        isOnline: false,
        error: 'Supabase is taking too long to respond. It may be paused or offline.',
        timestamp: Date.now(),
      };
      cachedHealthCheck = result;
      return result;
    }

    // Check for network errors
    if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('ERR_NAME_NOT_RESOLVED') ||
        error.message?.includes('ERR_NETWORK') ||
        error.message?.includes('network')) {
      const result: HealthCheckResult = {
        isOnline: false,
        error: 'Cannot connect to Supabase. It may be paused, offline, or there is a network issue.',
        timestamp: Date.now(),
      };
      cachedHealthCheck = result;
      return result;
    }

    // Other errors
    const result: HealthCheckResult = {
      isOnline: false,
      error: error.message || 'Unknown error checking Supabase health',
      timestamp: Date.now(),
    };
    cachedHealthCheck = result;
    return result;
  }
}

/**
 * Clear the health check cache (useful for retry scenarios)
 */
export function clearHealthCheckCache(): void {
  cachedHealthCheck = null;
}

/**
 * Wrap a Supabase operation with health check and timeout
 * Returns a user-friendly error message if Supabase is offline
 */
export async function withSupabaseHealthCheck<T>(
  operation: () => Promise<T>,
  operationName: string = 'operation'
): Promise<{ success: boolean; data?: T; error?: string }> {
  // First check health
  const health = await checkSupabaseHealth();
  
  if (!health.isOnline) {
    console.error(`[Supabase Health] ${operationName} blocked - Supabase is offline:`, health.error);
    return {
      success: false,
      error: health.error || 'Supabase is currently unavailable. Please try again later.',
    };
  }

  // Health check passed, proceed with operation
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error: any) {
    // Check if it's a network error
    const errorMessage = error?.message || '';
    if (errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
        errorMessage.includes('ERR_NETWORK') ||
        errorMessage.includes('network') ||
        error.name === 'TypeError') {
      console.error(`[Supabase Health] ${operationName} failed - Network error:`, errorMessage);
      // Clear cache so next health check will retry
      clearHealthCheckCache();
      return {
        success: false,
        error: 'Cannot connect to Supabase. It may be paused, offline, or there is a network issue. Please try again.',
      };
    }

    // Other errors - return the actual error message
    console.error(`[Supabase Health] ${operationName} failed:`, errorMessage);
    return {
      success: false,
      error: errorMessage || 'An error occurred. Please try again.',
    };
  }
}

/**
 * Create a fetch wrapper with AbortController timeout
 */
export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}
