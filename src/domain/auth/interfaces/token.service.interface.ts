import { IAccessTokenPayload } from './auth-subject.interface';

export interface ISignedAccessToken {
  accessToken: string;
  expiresInSeconds: number;
}

/**
 * Port for everything cryptographic about tokens, so the domain never
 * depends on a JWT library or on `crypto` directly.
 */
export interface ITokenService {
  signAccessToken(payload: IAccessTokenPayload): ISignedAccessToken;
  /**
   * @throws UnauthorizedError when the token is malformed, tampered or expired
   */
  verifyAccessToken(accessToken: string): IAccessTokenPayload;
  /** Opaque, random refresh token (never a JWT) */
  generateRefreshToken(): string;
  /** Only this hash is persisted, never the refresh token itself */
  hashRefreshToken(refreshToken: string): string;
}
