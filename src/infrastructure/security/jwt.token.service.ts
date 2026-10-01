import { createHash, randomBytes } from 'crypto';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import {
  ESubjectType,
  IAccessTokenPayload,
} from '../../domain/auth/interfaces/auth-subject.interface';
import {
  ISignedAccessToken,
  ITokenService,
} from '../../domain/auth/interfaces/token.service.interface';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error';

const JWT_ALGORITHM = 'HS256';
const REFRESH_TOKEN_BYTES = 32;

export interface IParamsJwtTokenService {
  secret: string;
  accessTokenTtlSeconds: number;
}

export class JwtTokenService implements ITokenService {
  private readonly secret: string;
  private readonly accessTokenTtlSeconds: number;

  constructor({ secret, accessTokenTtlSeconds }: IParamsJwtTokenService) {
    this.secret = secret;
    this.accessTokenTtlSeconds = accessTokenTtlSeconds;
  }

  signAccessToken(payload: IAccessTokenPayload): ISignedAccessToken {
    const accessToken = jwt.sign(payload, this.secret, {
      algorithm: JWT_ALGORITHM,
      expiresIn: this.accessTokenTtlSeconds,
    });
    return { accessToken, expiresInSeconds: this.accessTokenTtlSeconds };
  }

  verifyAccessToken(accessToken: string): IAccessTokenPayload {
    let decoded: string | jwt.JwtPayload;
    try {
      decoded = jwt.verify(accessToken, this.secret, {
        algorithms: [JWT_ALGORITHM],
      });
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedError('Access token expired', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid access token', 'TOKEN_INVALID');
    }

    if (!this.isAccessTokenPayload(decoded)) {
      throw new UnauthorizedError('Invalid access token', 'TOKEN_INVALID');
    }
    return {
      sub: decoded.sub,
      typ: decoded.typ,
      ...(decoded.role && { role: decoded.role }),
    };
  }

  generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  }

  hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private isAccessTokenPayload(
    decoded: string | jwt.JwtPayload,
  ): decoded is jwt.JwtPayload & IAccessTokenPayload {
    if (typeof decoded === 'string') {
      return false;
    }
    const hasValidRole =
      decoded.role === undefined ||
      Object.values(EStaffRole).includes(decoded.role);
    return (
      typeof decoded.sub === 'string' &&
      Object.values(ESubjectType).includes(decoded.typ) &&
      hasValidRole
    );
  }
}
