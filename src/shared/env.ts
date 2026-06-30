import { isCompiledRuntime } from './runtime.js';

const VALID_NODE_ENVS = new Set(['development', 'test', 'production']);
const DISALLOWED_SECRET_SNIPPETS = [
  'change-me',
  'change-before-prod',
  'local-dev',
  'super-secret',
  'replace-me',
  'example-secret',
];

function readEnv(name: string) {
  return process.env[name]?.trim() ?? '';
}

function readRequiredEnv(name: string) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function assertStrongSecret(name: string, value: string) {
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters long`);
  }

  const normalizedValue = value.toLowerCase();

  if (isProductionEnvironment() && DISALLOWED_SECRET_SNIPPETS.some((snippet) => normalizedValue.includes(snippet))) {
    throw new Error(`${name} must not use a placeholder or default value`);
  }
}

let hasValidatedRuntimeEnvironment = false;

export function getNodeEnv() {
  const nodeEnv = readRequiredEnv('NODE_ENV');

  if (!VALID_NODE_ENVS.has(nodeEnv)) {
    throw new Error('NODE_ENV must be one of: development, test, production');
  }

  return nodeEnv as 'development' | 'test' | 'production';
}

export function isProductionEnvironment() {
  return getNodeEnv() === 'production';
}

function normalizePublicUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function appUrlFromRailwayDomain() {
  const domain = readEnv('RAILWAY_PUBLIC_DOMAIN');
  return domain ? `https://${domain}` : '';
}

export function getAppUrl() {
  const configuredUrl = readEnv('APP_URL') || appUrlFromRailwayDomain();

  if (configuredUrl) {
    return normalizePublicUrl(configuredUrl);
  }

  if (isProductionEnvironment()) {
    throw new Error('APP_URL or RAILWAY_PUBLIC_DOMAIN is required in production');
  }

  return `http://localhost:${readEnv('PORT') || '3000'}`;
}

export function getJwtSecret() {
  const jwtSecret = readRequiredEnv('JWT_SECRET');
  assertStrongSecret('JWT_SECRET', jwtSecret);
  return jwtSecret;
}

export function validateRuntimeEnvironment() {
  if (hasValidatedRuntimeEnvironment) {
    return;
  }

  if (!process.env.NODE_ENV) {
    throw new Error("NODE_ENV is required");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }

  const nodeEnv = getNodeEnv();
  getJwtSecret();
  readRequiredEnv('DATABASE_URL');

  if (nodeEnv === 'production') {
    const dbUrl = readEnv('DATABASE_URL');
    const redisUrl = readEnv('REDIS_URL');
    const appUrl = readEnv('APP_URL') || appUrlFromRailwayDomain();
    const corsOrigin = readEnv('CORS_ORIGIN') || appUrl;

    if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
      throw new Error('DATABASE_URL cannot use localhost in production');
    }

    if (redisUrl && (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1'))) {
      throw new Error('REDIS_URL cannot use localhost in production');
    }

    if (readEnv('ENABLE_DEV_AUTH_FALLBACK') === 'true') {
      throw new Error('ENABLE_DEV_AUTH_FALLBACK must be disabled in production');
    }

    if (!appUrl) {
      throw new Error('APP_URL or RAILWAY_PUBLIC_DOMAIN is required in production');
    }

    if (appUrl.includes('localhost') || appUrl.includes('127.0.0.1')) {
      throw new Error('APP_URL cannot use localhost in production');
    }

    if (corsOrigin.includes('localhost') || corsOrigin.includes('127.0.0.1')) {
      throw new Error('CORS_ORIGIN cannot use localhost in production');
    }

    const storageDriver = readEnv('STORAGE_DRIVER') || 'disabled';
    if (!['disabled', 's3'].includes(storageDriver)) {
      throw new Error('STORAGE_DRIVER must be "s3" or "disabled" in production');
    }

    if (storageDriver === 's3') {
      readRequiredEnv('S3_ACCESS_KEY');
      readRequiredEnv('S3_SECRET_KEY');
      readRequiredEnv('S3_BUCKET');
    }
  }

  if (isCompiledRuntime && nodeEnv !== 'production') {
    throw new Error('NODE_ENV must be "production" when running the compiled server');
  }

  hasValidatedRuntimeEnvironment = true;
}

export function getS3Config() {
  const storageDriver = readEnv('STORAGE_DRIVER') || (isProductionEnvironment() ? 'disabled' : 'local');

  if (storageDriver !== 's3') {
    return null;
  }

  const region = process.env.S3_REGION || 'us-east-1';
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = readRequiredEnv('S3_ACCESS_KEY');
  const secretAccessKey = readRequiredEnv('S3_SECRET_KEY');
  const bucket = readRequiredEnv('S3_BUCKET');

  return {
    region,
    endpoint,
    forcePathStyle: readEnv('S3_FORCE_PATH_STYLE') === 'true',
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    bucket,
  };
}

export function getStorageDriver() {
  return readEnv('STORAGE_DRIVER') || (isProductionEnvironment() ? 'disabled' : 'local');
}
