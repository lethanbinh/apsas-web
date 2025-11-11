/**
 * Storage utility functions - uses sessionStorage (automatically cleared when tab/browser closes)
 */

/**
 * Set item in sessionStorage
 */
export function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    console.error('Error setting storage item:', error);
  }
}

/**
 * Get item from sessionStorage
 */
export function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.error('Error getting storage item:', error);
    return null;
  }
}

/**
 * Remove item from sessionStorage
 */
export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing storage item:', error);
  }
}

/**
 * Clear all sessionStorage
 */
export function clearStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.clear();
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}

