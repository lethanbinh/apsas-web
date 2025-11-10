/**
 * Cookie utility functions for client-side cookie management
 */

/**
 * Set a cookie
 * @param name Cookie name
 * @param value Cookie value
 * @param days Number of days until expiration (0 or undefined = session cookie, deleted when browser closes)
 */
export function setCookie(name: string, value: string, days?: number): void {
  if (typeof window === 'undefined') return;
  
  let cookieString = `${name}=${value};path=/;SameSite=Lax`;
  
  // If days is provided and > 0, set expiration
  // Otherwise, create a session cookie (deleted when browser closes)
  if (days && days > 0) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    cookieString += `;expires=${expires.toUTCString()}`;
  }
  // If days is 0 or undefined, it's a session cookie (no expires attribute)
  
  document.cookie = cookieString;
}

/**
 * Get a cookie value
 */
export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  
  return null;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string): void {
  if (typeof window === 'undefined') return;
  
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}
