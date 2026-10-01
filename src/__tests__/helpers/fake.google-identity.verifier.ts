import {
  IGoogleIdentityVerifier,
  IGoogleProfile,
} from '../../domain/auth/interfaces/google-identity.verifier.interface';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error';

const FAKE_TOKEN_PREFIX = 'fake-google';

/** Builds a token the fake verifier accepts */
export function fakeGoogleIdToken(profile: IGoogleProfile): string {
  return [
    FAKE_TOKEN_PREFIX,
    profile.sub,
    profile.email,
    profile.name ?? '',
  ].join('|');
}

/**
 * Accepts tokens built by `fakeGoogleIdToken` and rejects anything else,
 * so integration tests never call Google.
 */
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
