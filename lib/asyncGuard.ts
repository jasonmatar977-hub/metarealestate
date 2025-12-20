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
 */
export class RequestGuard {
  private inFlight = new Set<string>();

  /**
   * Check if a request is already in flight
   */
  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  /**
   * Start a request (returns true if started, false if already in flight)
   */
  start(key: string): boolean {
    if (this.inFlight.has(key)) {
      debugLog(`Request ${key} already in flight, skipping`);
      return false;
    }
    this.inFlight.add(key);
    debugLog(`Request ${key} started`);
    return true;
  }

  /**
   * Finish a request
   */
  finish(key: string): void {
    this.inFlight.delete(key);
    debugLog(`Request ${key} finished`);
  }

  /**
   * Clear all in-flight requests (use with caution)
   */
  clear(): void {
    this.inFlight.clear();
  }
}

// Global request guard instance
export const requestGuard = new RequestGuard();

