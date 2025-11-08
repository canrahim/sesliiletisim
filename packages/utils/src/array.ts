/**
 * Array utility functions
 */

/**
 * Remove duplicates from array
 * @param arr - Array with potential duplicates
 * @returns Array without duplicates
 */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Remove duplicates by property
 * @param arr - Array of objects
 * @param key - Property to check for uniqueness
 * @returns Array without duplicates
 */
export function uniqueBy<T, K extends keyof T>(arr: T[], key: K): T[] {
  const seen = new Set();
  return arr.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/**
 * Chunk array into smaller arrays
 * @param arr - Array to chunk
 * @param size - Size of each chunk
 * @returns Array of chunks
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 * @param arr - Array to shuffle
 * @returns Shuffled array (new array)
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get random item from array
 * @param arr - Array to pick from
 * @returns Random item or undefined if empty
 */
export function randomItem<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Group array items by key
 * @param arr - Array to group
 * @param key - Property to group by
 * @returns Object with grouped items
 */
export function groupBy<T, K extends keyof T>(
  arr: T[],
  key: K
): Record<string, T[]> {
  return arr.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Sort array by property
 * @param arr - Array to sort
 * @param key - Property to sort by
 * @param order - Sort order ('asc' or 'desc')
 * @returns Sorted array (new array)
 */
export function sortBy<T, K extends keyof T>(
  arr: T[],
  key: K,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Find intersection of multiple arrays
 * @param arrays - Arrays to intersect
 * @returns Array with common elements
 */
export function intersection<T>(...arrays: T[][]): T[] {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return arrays[0];
  
  return arrays.reduce((acc, arr) =>
    acc.filter(item => arr.includes(item))
  );
}

/**
 * Find difference between two arrays
 * @param arr1 - First array
 * @param arr2 - Second array
 * @returns Elements in arr1 but not in arr2
 */
export function difference<T>(arr1: T[], arr2: T[]): T[] {
  return arr1.filter(item => !arr2.includes(item));
}

/**
 * Check if arrays are equal
 * @param arr1 - First array
 * @param arr2 - Second array
 * @returns true if arrays have same elements in same order
 */
export function arrayEquals<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((item, index) => item === arr2[index]);
}

/**
 * Flatten nested array one level deep
 * @param arr - Nested array
 * @returns Flattened array
 */
export function flatten<T>(arr: (T | T[])[]): T[] {
  return arr.flat() as T[];
}

/**
 * Sum array of numbers
 * @param arr - Array of numbers
 * @returns Sum of all numbers
 */
export function sum(arr: number[]): number {
  return arr.reduce((acc, num) => acc + num, 0);
}

/**
 * Calculate average of array of numbers
 * @param arr - Array of numbers
 * @returns Average or 0 if empty
 */
export function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

/**
 * Find min value in array
 * @param arr - Array of numbers
 * @returns Minimum value or undefined if empty
 */
export function min(arr: number[]): number | undefined {
  if (arr.length === 0) return undefined;
  return Math.min(...arr);
}

/**
 * Find max value in array
 * @param arr - Array of numbers
 * @returns Maximum value or undefined if empty
 */
export function max(arr: number[]): number | undefined {
  if (arr.length === 0) return undefined;
  return Math.max(...arr);
}
