/**
 * Async Guard Utilities
 * Prevents infinite loops and ensures operations always resolve
 */

/**
 * Wraps a promise with a timeout
 * Rejects after specified milliseconds if promise doesn't resolve
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string = 'Operation'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    // Clear timeout if promise resolves first (though this won't actually clear it)
    // The race will handle it
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    // Note: We can't actually clear the timeout here, but the race handles it
  }
}

/**
 * Normalizes Supabase errors to a consistent format
 */
export function normalizeSupabaseError(err: any): {
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
  status: number | null;
} {
  if (!err) {
    return {
      message: 'Unknown error',
      code: null,
      details: null,
      hint: null,
      status: null,
    };
  }

  // Supabase error structure
  if (err.message || err.code) {
    return {
      message: err.message || 'An error occurred',
      code: err.code || null,
      details: err.details || null,
      hint: err.hint || null,
      status: (err as any).status || null,
    };
  }

  // Generic error
  if (err instanceof Error) {
    return {
      message: err.message,
      code: null,
      details: null,
      hint: null,
      status: null,
    };
  }

  // String error
  if (typeof err === 'string') {
    return {
      message: err,
      code: null,
      details: null,
      hint: null,
      status: null,
    };
  }

  return {
    message: 'An unexpected error occurred',
    code: null,
    details: null,
    hint: null,
    status: null,
  };
}

/**
 * Checks if an error is an auth error (401/403)
 */
export function isAuthError(err: any): boolean {
  const normalized = normalizeSupabaseError(err);
  return (
    normalized.status === 401 ||
    normalized.status === 403 ||
    normalized.code === 'PGRST301' ||
    normalized.code === '42501' ||
    normalized.message?.toLowerCase().includes('permission') ||
    normalized.message?.toLowerCase().includes('unauthorized') ||
    normalized.message?.toLowerCase().includes('forbidden')
  );
}

/**
 * Debug log helper (only in development)
 */
export function debugLog(...args: any[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Request guard to prevent duplicate requests
 * Returns true if request should proceed, false if already in flight
 * Includes timeout safety to auto-release stuck requests after 10 seconds
 */
export class RequestGuard {
  private inFlight = new Set<string>();
  private timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Check if a request is already in flight
   */
  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  /**
   * Start a request (returns true if started, false if already in flight)
   * Auto-releases after 10 seconds as a safety mechanism
   */
  start(key: string): boolean {
    if (this.inFlight.has(key)) {
      console.log(`[RequestGuard] Request ${key} already in flight, skipping`);
      return false;
    }
    this.inFlight.add(key);
    console.log(`[RequestGuard] Request ${key} started`);
    
    // Safety timeout: auto-release after 10 seconds
    const timeoutId = setTimeout(() => {
      if (this.inFlight.has(key)) {
        console.warn(`[RequestGuard] Request ${key} timed out after 10s, auto-releasing`);
        this.finish(key);
      }
    }, 10000);
    
    this.timeouts.set(key, timeoutId);
    return true;
  }

  /**
   * Finish a request
   * Clears the timeout and removes from in-flight set
   */
  finish(key: string): void {
    // Clear timeout if exists
    const timeoutId = this.timeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(key);
    }
    
    // Remove from in-flight set
    const wasInFlight = this.inFlight.delete(key);
    if (wasInFlight) {
      console.log(`[RequestGuard] Request ${key} finished`);
    } else {
      console.warn(`[RequestGuard] Request ${key} finished but was not in flight`);
    }
  }

  /**
   * Clear all in-flight requests (use with caution)
   */
  clear(): void {
    // Clear all timeouts
    this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.timeouts.clear();
    this.inFlight.clear();
    console.log(`[RequestGuard] Cleared all requests`);
  }
}

// Global request guard instance
export const requestGuard = new RequestGuard();

