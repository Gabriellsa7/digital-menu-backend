import { ITokenService } from '../../../domain/auth/interfaces/token.service.interface';
import { JwtTokenService } from '../../security/jwt.token.service';
import { env } from '../env';

let tokenService: ITokenService | undefined;

export class TokenServiceFactory {
  // Shared instance: the auth controllers and every guarded controller must
  // sign and verify with the same configuration.
  static create(): ITokenService {
    tokenService ??= new JwtTokenService({
      secret: env.jwtAccessSecret,
      accessTokenTtlSeconds: env.accessTokenTtlSeconds,
    });
    return tokenService;
  }
}
