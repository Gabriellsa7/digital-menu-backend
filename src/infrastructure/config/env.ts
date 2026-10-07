function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 900;
const DEFAULT_STAFF_REFRESH_TTL_DAYS = 7;
const DEFAULT_CUSTOMER_REFRESH_TTL_DAYS = 30;
const DEFAULT_BCRYPT_ROUNDS = 10;
const DEFAULT_AUTH_RATE_LIMIT_MAX = 20;

export const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUri: requireEnv('DATABASE_URI'),
  isProduction: process.env.NODE_ENV === 'production',
  jwtAccessSecret: requireEnv('JWT_ACCESS_SECRET'),
  accessTokenTtlSeconds:
    Number(process.env.JWT_ACCESS_TTL_SECONDS) ||
    DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
  staffRefreshTtlDays:
    Number(process.env.REFRESH_TTL_STAFF_DAYS) ||
    DEFAULT_STAFF_REFRESH_TTL_DAYS,
  customerRefreshTtlDays:
    Number(process.env.REFRESH_TTL_CUSTOMER_DAYS) ||
    DEFAULT_CUSTOMER_REFRESH_TTL_DAYS,
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  otpPepper: requireEnv('OTP_PEPPER'),
  otpExposeCode: process.env.OTP_EXPOSE_CODE === 'true',
  googleClientId: requireEnv('GOOGLE_CLIENT_ID'),
  authRateLimitMax:
    Number(process.env.AUTH_RATE_LIMIT_MAX) || DEFAULT_AUTH_RATE_LIMIT_MAX,
  bootstrapOwnerName: process.env.BOOTSTRAP_OWNER_NAME || 'Owner',
  bootstrapOwnerEmail: process.env.BOOTSTRAP_OWNER_EMAIL || undefined,
  bootstrapOwnerPassword: process.env.BOOTSTRAP_OWNER_PASSWORD || undefined,
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || DEFAULT_BCRYPT_ROUNDS,
};
