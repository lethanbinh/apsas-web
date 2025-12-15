


export function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    console.error('Error setting storage item:', error);
  }
}


export function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.error('Error getting storage item:', error);
    return null;
  }
}


export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing storage item:', error);
  }
}


export function clearStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.clear();
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}

