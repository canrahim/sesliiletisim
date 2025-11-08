/**
 * Format date to localized string
 * @param date - Date to format
 * @param locale - Locale (default: 'tr-TR')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  locale: string = 'tr-TR',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format relative time (e.g., "2 dakika önce", "3 saat önce")
 * @param date - Date to compare
 * @param locale - Locale (default: 'tr-TR')
 * @returns Relative time string
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: string = 'tr-TR'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date;
  
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  if (diffSecs < 60) return rtf.format(-diffSecs, 'second');
  if (diffMins < 60) return rtf.format(-diffMins, 'minute');
  if (diffHours < 24) return rtf.format(-diffHours, 'hour');
  if (diffDays < 30) return rtf.format(-diffDays, 'day');
  
  return formatDate(dateObj, locale, { dateStyle: 'medium' });
}

/**
 * Format file size to human readable format
 * @param bytes - Size in bytes
 * @param locale - Locale (default: 'tr-TR')
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number, locale: string = 'tr-TR'): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2
  }).format(size)} ${units[unitIndex]}`;
}

/**
 * Format number with thousands separator
 * @param num - Number to format
 * @param locale - Locale (default: 'tr-TR')
 * @returns Formatted number string
 */
export function formatNumber(num: number, locale: string = 'tr-TR'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format currency
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'TRY')
 * @param locale - Locale (default: 'tr-TR')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'TRY',
  locale: string = 'tr-TR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Format duration in milliseconds to human readable string
 * @param ms - Duration in milliseconds
 * @param locale - Locale (default: 'tr-TR')
 * @returns Formatted duration string (e.g., "1s 500ms")
 */
export function formatDuration(ms: number, locale: string = 'tr-TR'): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}s ${minutes % 60}d`;
  }
  if (minutes > 0) {
    return `${minutes}d ${seconds % 60}s`;
  }
  if (seconds > 0) {
    return `${seconds}s`;
  }
  return `${ms}ms`;
}
