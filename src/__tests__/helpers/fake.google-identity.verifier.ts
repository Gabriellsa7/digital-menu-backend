import {
  IGoogleIdentityVerifier,
  IGoogleProfile,
} from '../../domain/auth/interfaces/google-identity.verifier.interface';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error';

const FAKE_TOKEN_PREFIX = 'fake-google';

export function fakeGoogleIdToken(profile: IGoogleProfile): string {
  return [
    FAKE_TOKEN_PREFIX,
    profile.sub,
    profile.email,
    profile.name ?? '',
  ].join('|');
}

export class FakeGoogleIdentityVerifier implements IGoogleIdentityVerifier {
  async verifyIdToken(idToken: string): Promise<IGoogleProfile> {
    const [prefix, sub, email, name] = idToken.split('|');
    if (prefix !== FAKE_TOKEN_PREFIX || !sub || !email) {
      throw new UnauthorizedError(
        'Invalid Google token',
        'GOOGLE_TOKEN_INVALID',
      );
    }
    return { sub, email, ...(name && { name }) };
  }
}
