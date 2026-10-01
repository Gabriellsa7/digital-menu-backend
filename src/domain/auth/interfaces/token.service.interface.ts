import { IAccessTokenPayload } from './auth-subject.interface';

export interface ISignedAccessToken {
  accessToken: string;
  expiresInSeconds: number;
}

export interface ITokenService {
  signAccessToken(payload: IAccessTokenPayload): ISignedAccessToken;
  verifyAccessToken(accessToken: string): IAccessTokenPayload;
  generateRefreshToken(): string;
  hashRefreshToken(refreshToken: string): string;
}
