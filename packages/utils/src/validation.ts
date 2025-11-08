/**
 * Email validation utility
 * @param email - Email address to validate
 * @returns true if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * URL validation utility
 * @param url - URL to validate
 * @returns true if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Strong password validation
 * Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 * @param password - Password to validate
 * @returns true if password meets requirements
 */
export function isStrongPassword(password: string): boolean {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    hasSpecialChar
  );
}

/**
 * Turkish phone number validation
 * @param phone - Phone number to validate
 * @returns true if valid Turkish phone number
 */
export function isValidTurkishPhone(phone: string): boolean {
  // Turkish phone: +90 5XX XXX XX XX or 05XX XXX XX XX
  const phoneRegex = /^(\+90|0)?5\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Username validation (alphanumeric, underscore, dash, 3-20 chars)
 * @param username - Username to validate
 * @returns true if valid username
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
}
