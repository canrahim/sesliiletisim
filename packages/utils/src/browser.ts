/**
 * Browser storage utilities with type safety and error handling
 */

/**
 * Get item from localStorage with JSON parsing
 * @param key - Storage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns Parsed value or default
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Set item in localStorage with JSON stringification
 * @param key - Storage key
 * @param value - Value to store
 */
export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting localStorage:', error);
  }
}

/**
 * Remove item from localStorage
 * @param key - Storage key
 */
export function removeLocalStorage(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing localStorage:', error);
  }
}

/**
 * Get item from sessionStorage with JSON parsing
 * @param key - Storage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns Parsed value or default
 */
export function getSessionStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = window.sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Set item in sessionStorage with JSON stringification
 * @param key - Storage key
 * @param value - Value to store
 */
export function setSessionStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting sessionStorage:', error);
  }
}

/**
 * Check if code is running in browser
 * @returns true if in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if device is mobile
 * @returns true if mobile device
 */
export function isMobile(): boolean {
  if (!isBrowser()) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise<boolean> - Success status
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!isBrowser()) return false;
  
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        return true;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  } catch {
    return false;
  }
}

/**
 * Get cookie value by name
 * @param name - Cookie name
 * @returns Cookie value or null
 */
export function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Detect user's preferred language
 * @returns Language code (e.g., 'tr', 'en')
 */
export function detectLanguage(): string {
  if (!isBrowser()) return 'tr';
  
  const lang = navigator.language || (navigator as any).userLanguage;
  return lang.split('-')[0]; // Get primary language code
}

/**
 * Request notification permission
 * @returns Promise<NotificationPermission>
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowser() || !('Notification' in window)) {
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }
  
  return 'denied';
}

/**
 * Show browser notification
 * @param title - Notification title
 * @param options - Notification options
 * @returns Notification instance or null
 */
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!isBrowser() || Notification.permission !== 'granted') {
    return null;
  }
  
  try {
    return new Notification(title, options);
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
}
