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
  // Detect ChunkLoadError (common in dev mode)
  const isChunkLoadError = 
    error.message?.includes('Loading chunk') ||
    error.message?.includes('ChunkLoadError') ||
    error.message?.includes('Failed to fetch dynamically imported module') ||
    error.name === 'ChunkLoadError' ||
    (typeof window !== 'undefined' && error.message?.includes('timeout'));

  // Detect if running in WhatsApp in-app browser
  const isWhatsApp = typeof window !== 'undefined' && 
    /WhatsApp/i.test(navigator.userAgent);
  
  // Check if error is storage-related
  const isStorageError = error.message?.includes('operation is insecure') ||
    error.message?.includes('SecurityError') ||
    error.name === 'SecurityError';

  useEffect(() => {
    // Log critical error to console with better diagnostics
    console.error("=== GLOBAL ERROR (ROOT LEVEL) ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error digest:", error.digest);
    
    if (error.stack) {
      console.error("Error stack:", error.stack);
    }
    
    if (error.cause) {
      console.error("Error cause:", error.cause);
    }

    if (isChunkLoadError) {
      console.error("🔴 CHUNK LOAD ERROR DETECTED");
      console.error("This usually happens when:");
      console.error("1. Dev server restarted but browser has old chunks cached");
      console.error("2. Port mismatch (server on 3000, browser cached 3001)");
      console.error("3. Hot reload failed to update chunks");
      console.error("Solution: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)");
    }

    if (isStorageError) {
      console.error("Storage error detected - localStorage may be blocked");
    }

    // In production, send to error tracking service immediately
    // Example: Sentry.captureException(error, { level: 'fatal' });
  }, [error, isChunkLoadError, isStorageError]);

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

            {isChunkLoadError && (
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
                <p className="text-sm text-blue-800 font-semibold mb-2">
                  🔄 Chunk Load Error (Dev Mode)
                </p>
                <p className="text-xs text-blue-700 mb-3">
                  This happens when the dev server restarts or chunks are stale. A hard refresh will fix it.
                </p>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      // Clear Next.js cache and reload
                      if ('caches' in window) {
                        caches.keys().then((names) => {
                          names.forEach((name) => {
                            caches.delete(name);
                          });
                        });
                      }
                      // Force reload bypassing cache
                      window.location.reload();
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors text-sm mb-2"
                >
                  Hard Refresh & Clear Cache
                </button>
                <p className="text-xs text-blue-600 mt-2">
                  Or press <kbd className="px-2 py-1 bg-blue-100 rounded">Ctrl+Shift+R</kbd> (Windows) or <kbd className="px-2 py-1 bg-blue-100 rounded">Cmd+Shift+R</kbd> (Mac)
                </p>
              </div>
            )}

            {(isWhatsApp || isStorageError) && (
              <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
                <p className="text-sm text-yellow-800 font-semibold mb-2">
                  {isWhatsApp ? '⚠️ Detected: WhatsApp In-App Browser' : '⚠️ Storage Access Issue'}
                </p>
                <p className="text-xs text-yellow-700 mb-3">
                  {isWhatsApp 
                    ? 'For the best experience, please open this link in Safari or Chrome.'
                    : 'Your browser has blocked storage access. The app will work but some features may be limited.'}
                </p>
                {isWhatsApp && (
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        const url = window.location.href;
                        // Try to open in Safari (iOS)
                        window.location.href = url.replace(/^https?:\/\//, 'x-safari-https://');
                        // Fallback: show instructions
                        setTimeout(() => {
                          alert('Please copy this link and open it in Safari:\n\n' + url);
                        }, 100);
                      }
                    }}
                    className="w-full px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors text-sm"
                  >
                    Open in Safari
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {isChunkLoadError ? (
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      // Clear all caches
                      if ('caches' in window) {
                        caches.keys().then((names) => {
                          names.forEach((name) => caches.delete(name));
                        });
                      }
                      // Clear service workers if any
                      if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then((registrations) => {
                          registrations.forEach((registration) => registration.unregister());
                        });
                      }
                      // Force reload
                      window.location.reload();
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                >
                  Hard Refresh Required (Clears Cache)
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      try {
                        // Reset the error boundary
                        reset();
                        // Also reload the page as a fallback
                        if (typeof window !== 'undefined') {
                          setTimeout(() => {
                            window.location.href = '/';
                          }, 100);
                        }
                      } catch (resetError) {
                        // Prevent crash loop - if reset fails, just reload
                        console.error("Reset failed, reloading page:", resetError);
                        if (typeof window !== 'undefined') {
                          window.location.href = '/';
                        }
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
                </>
              )}
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

