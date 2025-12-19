"use client";

/**
 * Global Error Boundary
 * Catches errors at the root level of the application
 * This is the last line of defense for unhandled errors
 */

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log critical error to console
    console.error("=== GLOBAL ERROR (ROOT LEVEL) ===");
    console.error("This is a critical error that occurred at the root of the application");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error digest:", error.digest);
    console.error("Error name:", error.name);
    
    if (error.cause) {
      console.error("Error cause:", error.cause);
    }

    // In production, send to error tracking service immediately
    // Example: Sentry.captureException(error, { level: 'fatal' });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="max-w-md w-full glass-dark rounded-3xl p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-500"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="font-orbitron text-3xl font-bold text-gray-900 mb-2">
                Critical Error
              </h1>
              <p className="text-gray-600 mb-6">
                A critical error occurred. The application needs to be reloaded.
              </p>
            </div>

            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-sm text-red-800 font-semibold mb-2">Error Details:</p>
              <p className="text-xs text-red-600 font-mono break-all">
                {error.message || "An unknown critical error occurred"}
              </p>
              {error.digest && (
                <p className="text-xs text-red-500 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  // Reset the error boundary
                  reset();
                  // Also reload the page as a fallback
                  if (typeof window !== 'undefined') {
                    window.location.href = '/';
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-lg transition-all"
              >
                Reload Application
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
                className="px-6 py-3 bg-white border-2 border-gold text-gold font-bold rounded-xl hover:bg-gold hover:text-gray-900 transition-all"
              >
                Hard Refresh
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gold/20">
              <p className="text-xs text-gray-500">
                If this problem persists, please clear your browser cache and try again.
                <br />
                Error ID: {error.digest || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

