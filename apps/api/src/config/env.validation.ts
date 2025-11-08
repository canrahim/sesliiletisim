import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

interface EnvValidationResult {
  isValid: boolean;
  missingVars: string[];
  invalidVars: { key: string; reason: string }[];
}

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
] as const;

/**
 * Optional but recommended environment variables
 */
const RECOMMENDED_ENV_VARS = [
  'NODE_ENV',
  'PORT',
  'HOST',
  'API_PREFIX',
  'CORS_ORIGIN',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'TURN_URLS',
  'TURN_USERNAME',
  'TURN_PASSWORD',
] as const;

/**
 * Validate environment variables
 */
export function validateEnvironment(): EnvValidationResult {
  const missing: string[] = [];
  const invalid: { key: string; reason: string }[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    invalid.push({
      key: 'DATABASE_URL',
      reason: 'Must be a valid PostgreSQL connection string',
    });
  }

  // Validate JWT secrets (minimum length)
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    invalid.push({
      key: 'JWT_SECRET',
      reason: 'Should be at least 32 characters long',
    });
  }

  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    invalid.push({
      key: 'JWT_REFRESH_SECRET',
      reason: 'Should be at least 32 characters long',
    });
  }

  // Validate REDIS_PORT
  if (process.env.REDIS_PORT && isNaN(parseInt(process.env.REDIS_PORT))) {
    invalid.push({
      key: 'REDIS_PORT',
      reason: 'Must be a valid port number',
    });
  }

  // Validate NODE_ENV
  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    invalid.push({
      key: 'NODE_ENV',
      reason: 'Must be one of: development, production, test',
    });
  }

  return {
    isValid: missing.length === 0 && invalid.length === 0,
    missingVars: missing,
    invalidVars: invalid,
  };
}

/**
 * Validate and throw if invalid (for application startup)
 */
export function validateEnvironmentOrThrow(): void {
  logger.log('🔍 Validating environment variables...');

  const result = validateEnvironment();

  if (!result.isValid) {
    if (result.missingVars.length > 0) {
      logger.error('❌ Missing required environment variables:');
      result.missingVars.forEach((varName) => {
        logger.error(`   - ${varName}`);
      });
    }

    if (result.invalidVars.length > 0) {
      logger.error('❌ Invalid environment variables:');
      result.invalidVars.forEach(({ key, reason }) => {
        logger.error(`   - ${key}: ${reason}`);
      });
    }

    throw new Error('Environment validation failed. Please check your .env file.');
  }

  // Log warnings for missing recommended variables
  const missingRecommended = RECOMMENDED_ENV_VARS.filter(
    (varName) => !process.env[varName]
  );

  if (missingRecommended.length > 0) {
    logger.warn('⚠️  Missing recommended environment variables:');
    missingRecommended.forEach((varName) => {
      logger.warn(`   - ${varName}`);
    });
  }

  logger.log('✅ Environment validation passed');
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

/**
 * Get environment variable with type safety and default value
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is not defined and no default value provided`);
  }
  return value || defaultValue!;
}

/**
 * Get numeric environment variable
 */
export function getEnvVarNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is not defined and no default value provided`);
    }
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} is not a valid number: ${value}`);
  }
  return parsed;
}

/**
 * Get boolean environment variable
 */
export function getEnvVarBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is not defined and no default value provided`);
    }
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

