import { OAuth2Client } from 'google-auth-library';
import { Logger } from 'traceability';
import {
  IGoogleIdentityVerifier,
  IGoogleProfile,
} from '../../domain/auth/interfaces/google-identity.verifier.interface';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error';

export class GoogleIdentityVerifier implements IGoogleIdentityVerifier {
  private readonly client: OAuth2Client;

  constructor(
    private readonly clientId: string,
    client?: OAuth2Client,
  ) {
    this.client = client ?? new OAuth2Client(clientId);
  }

  async verifyIdToken(idToken: string): Promise<IGoogleProfile> {
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch (error) {
      Logger.warn('Google ID token rejected', {
        eventName: 'auth.google_token_rejected',
        reason: (error as Error).message,
      });
      throw this.invalidTokenError();
    }

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw this.invalidTokenError();
    }
    return {
      sub: payload.sub,
      email: payload.email,
      ...(payload.name && { name: payload.name }),
      ...(payload.picture && { picture: payload.picture }),
    };
  }

  private invalidTokenError(): UnauthorizedError {
    return new UnauthorizedError(
      'Invalid Google token',
      'GOOGLE_TOKEN_INVALID',
    );
  }
}
