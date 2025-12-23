import { getStorageItem, removeStorageItem, setStorageItem } from './storage';
const SESSION_START_KEY = 'session_start_time';
const SESSION_EXPIRY_KEY = 'session_expiry_time';
export interface SessionTimeoutConfig {
  onExpire: () => void;
}
let timeoutId: NodeJS.Timeout | null = null;
export function getTokenExpiration(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let padded = base64;
    while (padded.length % 4) {
      padded += '=';
    }
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return decoded.exp ? decoded.exp * 1000 : null;
  } catch (error) {
    console.error('Failed to decode token expiration:', error);
    return null;
  }
}
export function initSessionTimeout(token: string, onExpire: () => void): void {
  clearSessionTimeout();
  const expiryTime = getTokenExpiration(token);
  if (!expiryTime) {
    console.warn('Could not determine token expiration, session timeout not initialized');
    return;
  }
  const now = Date.now();
  const remainingTime = expiryTime - now;
  if (remainingTime <= 0) {
    onExpire();
    return;
  }
  setStorageItem(SESSION_START_KEY, String(now));
  setStorageItem(SESSION_EXPIRY_KEY, String(expiryTime));
  timeoutId = setTimeout(() => {
    console.log('Session expired, logging out...');
    clearSessionTimeout();
    onExpire();
  }, remainingTime);
  console.log(`Session timeout initialized. Will expire in ${Math.floor(remainingTime / 1000)} seconds`);
}
export function resumeSessionTimeout(onExpire: () => void, token?: string): void {
  clearSessionTimeout();
  const expiryTimeStr = getStorageItem(SESSION_EXPIRY_KEY);
  if (!expiryTimeStr) {
    console.log('No session expiry time found, skipping resume');
    if (token) {
      console.log('Initializing from token instead...');
      initSessionTimeout(token, onExpire);
    }
    return;
  }
  const storedExpiryTime = parseInt(expiryTimeStr, 10);
  const now = Date.now();
  const remainingTime = storedExpiryTime - now;
  if (remainingTime <= 0) {
    console.log('Session already expired');
    clearSessionTimeout();
    onExpire();
    return;
  }
  timeoutId = setTimeout(() => {
    console.log('Session expired, logging out...');
    clearSessionTimeout();
    onExpire();
  }, remainingTime);
  console.log(`Session timeout resumed. Will expire in ${Math.floor(remainingTime / 1000)} seconds`);
}
export function clearSessionTimeout(): void {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  removeStorageItem(SESSION_START_KEY);
  removeStorageItem(SESSION_EXPIRY_KEY);
}
export function isSessionExpired(): boolean {
  const expiryTimeStr = getStorageItem(SESSION_EXPIRY_KEY);
  if (!expiryTimeStr) return true;
  const expiryTime = parseInt(expiryTimeStr, 10);
  return Date.now() >= expiryTime;
}