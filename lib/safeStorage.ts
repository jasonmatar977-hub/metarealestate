/**
 * Safe Storage Utility
 * Wraps localStorage/sessionStorage access with try/catch to handle
 * SecurityError when storage is blocked (e.g., in WhatsApp in-app browser)
 * 
 * Falls back to in-memory storage when localStorage is unavailable
 */

// In-memory fallback storage
const memoryStore = new Map<string, string>();

/**
 * Check if localStorage is available and accessible
 */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

const storageAvailable = typeof window !== 'undefined' ? isStorageAvailable() : false;

/**
 * Safely get a value from localStorage
 * Falls back to memory storage if localStorage is unavailable
 * @param key The storage key
 * @returns The stored value or null if not found
 */
export function safeGet(key: string): string | null {
  if (typeof window === 'undefined') {
    return memoryStore.get(key) ?? null;
  }

  if (storageAvailable) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      // Storage access failed, fall back to memory
      console.warn(`[safeStorage] localStorage.getItem failed for key "${key}", using memory fallback:`, error);
      return memoryStore.get(key) ?? null;
    }
  } else {
    // Storage not available, use memory
    return memoryStore.get(key) ?? null;
  }
}

/**
 * Safely set a value in localStorage
 * Falls back to memory storage if localStorage is unavailable
 * @param key The storage key
 * @param value The value to store
 * @returns true if successful, false otherwise
 */
export function safeSet(key: string, value: string): boolean {
  if (typeof window === 'undefined') {
    memoryStore.set(key, value);
    return true;
  }

  if (storageAvailable) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      // Storage access failed, fall back to memory
      console.warn(`[safeStorage] localStorage.setItem failed for key "${key}", using memory fallback:`, error);
      memoryStore.set(key, value);
      return false; // Indicates fallback was used
    }
  } else {
    // Storage not available, use memory
    memoryStore.set(key, value);
    return false; // Indicates fallback was used
  }
}

/**
 * Safely remove a value from localStorage
 * Also removes from memory fallback
 * @param key The storage key
 * @returns true if successful, false otherwise
 */
export function safeRemove(key: string): boolean {
  if (typeof window === 'undefined') {
    memoryStore.delete(key);
    return true;
  }

  let removed = false;

  if (storageAvailable) {
    try {
      localStorage.removeItem(key);
      removed = true;
    } catch (error) {
      // Storage access failed, still try to remove from memory
      console.warn(`[safeStorage] localStorage.removeItem failed for key "${key}":`, error);
    }
  }

  // Always remove from memory fallback
  memoryStore.delete(key);
  return removed;
}

/**
 * Get all keys from storage (for cleanup operations)
 * Returns keys from both localStorage and memory fallback
 */
export function safeGetAllKeys(): string[] {
  const keys: string[] = [];

  if (typeof window !== 'undefined' && storageAvailable) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          keys.push(key);
        }
      }
    } catch (error) {
      console.warn('[safeStorage] Failed to get localStorage keys:', error);
    }
  }

  // Add memory store keys
  memoryStore.forEach((_, key) => {
    if (!keys.includes(key)) {
      keys.push(key);
    }
  });

  return keys;
}

/**
 * Check if storage is available (for debugging)
 */
export function isStorageAccessible(): boolean {
  return storageAvailable;
}








