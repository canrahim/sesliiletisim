/**
 * Object utility functions
 */

/**
 * Deep clone an object
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as any;
  }
  
  if (obj instanceof Object) {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  
  return obj;
}

/**
 * Deep merge objects
 * @param target - Target object
 * @param sources - Source objects to merge
 * @returns Merged object
 */
export function deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;
  
  const result = { ...target };
  
  for (const source of sources) {
    if (!source) continue;
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const targetValue = result[key];
        const sourceValue = source[key];
        
        if (
          targetValue &&
          sourceValue &&
          typeof targetValue === 'object' &&
          typeof sourceValue === 'object' &&
          !Array.isArray(targetValue) &&
          !Array.isArray(sourceValue)
        ) {
          result[key] = deepMerge(targetValue, sourceValue as any);
        } else {
          result[key] = sourceValue as any;
        }
      }
    }
  }
  
  return result;
}

/**
 * Pick specified properties from object
 * @param obj - Source object
 * @param keys - Keys to pick
 * @returns New object with picked properties
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Omit specified properties from object
 * @param obj - Source object
 * @param keys - Keys to omit
 * @returns New object without omitted properties
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result as Omit<T, K>;
}

/**
 * Check if object is empty
 * @param obj - Object to check
 * @returns true if object has no own properties
 */
export function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Get nested property value safely
 * @param obj - Source object
 * @param path - Dot-separated path (e.g., 'user.profile.name')
 * @param defaultValue - Default value if path doesn't exist
 * @returns Value at path or default
 */
export function get<T = any>(
  obj: any,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return defaultValue;
    }
  }
  
  return result;
}

/**
 * Set nested property value safely
 * @param obj - Target object
 * @param path - Dot-separated path
 * @param value - Value to set
 * @returns Modified object
 */
export function set<T extends object>(
  obj: T,
  path: string,
  value: any
): T {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current: any = obj;
  
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
  return obj;
}

/**
 * Check deep equality of two objects
 * @param obj1 - First object
 * @param obj2 - Second object
 * @returns true if objects are deeply equal
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (
    obj1 == null ||
    obj2 == null ||
    typeof obj1 !== 'object' ||
    typeof obj2 !== 'object'
  ) {
    return false;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  return keys1.every(key =>
    keys2.includes(key) && deepEqual(obj1[key], obj2[key])
  );
}

/**
 * Flatten nested object to dot notation
 * @param obj - Object to flatten
 * @param prefix - Prefix for keys
 * @returns Flattened object
 */
export function flattenObject(
  obj: Record<string, any>,
  prefix: string = ''
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(result, flattenObject(obj[key], newKey));
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  
  return result;
}

/**
 * Convert object keys to camelCase
 * @param obj - Object to convert
 * @returns Object with camelCase keys
 */
export function camelCaseKeys<T extends Record<string, any>>(obj: T): any {
  if (Array.isArray(obj)) {
    return obj.map(item => camelCaseKeys(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = camelCaseKeys(obj[key]);
      return result;
    }, {} as any);
  }
  
  return obj;
}

/**
 * Convert object keys to snake_case
 * @param obj - Object to convert
 * @returns Object with snake_case keys
 */
export function snakeCaseKeys<T extends Record<string, any>>(obj: T): any {
  if (Array.isArray(obj)) {
    return obj.map(item => snakeCaseKeys(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = snakeCaseKeys(obj[key]);
      return result;
    }, {} as any);
  }
  
  return obj;
}
