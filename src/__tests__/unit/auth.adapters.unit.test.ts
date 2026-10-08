import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { ESubjectType } from '../../domain/auth/interfaces/auth-subject.interface';
import { normalizeBrazilianMobile } from '../../domain/common/phone';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { CryptoOtpCodeGenerator } from '../../infrastructure/security/crypto.otp-code.generator';
import { GoogleIdentityVerifier } from '../../infrastructure/security/google.identity.verifier';
import { JwtTokenService } from '../../infrastructure/security/jwt.token.service';

const SECRET = 'unit-test-secret';

describe('When we normalize a Brazilian mobile phone', () => {
  it.each([
    ['(11) 99999-8888', '+5511999998888'],
    ['+55 11 99999-8888', '+5511999998888'],
    ['5521988887777', '+5521988887777'],
  ])('should turn %s into %s', (input, expected) => {
    expect(normalizeBrazilianMobile(input)).toBe(expected);
  });

  it.each(['(11) 3333-4444', '(01) 99999-8888', '123', '+1 415 555 0100'])(
    'should reject %s',
    (input) => {
      expect(normalizeBrazilianMobile(input)).toBeUndefined();
    },
  );
});

describe('When we use JWT access tokens', () => {
  const tokenService = new JwtTokenService({
    secret: SECRET,
    accessTokenTtlSeconds: 900,
  });

  it('should verify a token it signed', () => {
    const { accessToken, expiresInSeconds } = tokenService.signAccessToken({
      sub: 'staff-1',
      typ: ESubjectType.STAFF,
      role: EStaffRole.OWNER,
      storeId: 'store-1',
    });

    expect(expiresInSeconds).toBe(900);
    expect(tokenService.verifyAccessToken(accessToken)).toEqual({
      sub: 'staff-1',
      typ: ESubjectType.STAFF,
      role: EStaffRole.OWNER,
      storeId: 'store-1',
    });
  });

  it('should throw TOKEN_EXPIRED for an expired token', () => {
    const expired = jwt.sign(
      { sub: 'customer-1', typ: ESubjectType.CUSTOMER },
      SECRET,
      { expiresIn: -10 },
    );

    expect(() => tokenService.verifyAccessToken(expired)).toThrow(
      expect.objectContaining({ code: 'TOKEN_EXPIRED' }),
    );
  });

  it('should throw TOKEN_INVALID for a token signed with another secret', () => {
    const forged = jwt.sign(
      { sub: 'customer-1', typ: ESubjectType.CUSTOMER },
      'another-secret',
    );

    expect(() => tokenService.verifyAccessToken(forged)).toThrow(
      expect.objectContaining({ code: 'TOKEN_INVALID' }),
    );
  });

  it('should throw TOKEN_INVALID for a token with an unknown subject type', () => {
    const unknownType = jwt.sign({ sub: 'x', typ: 'ADMIN' }, SECRET);

    expect(() => tokenService.verifyAccessToken(unknownType)).toThrow(
      expect.objectContaining({ code: 'TOKEN_INVALID' }),
    );
  });

  it('should generate random refresh tokens and hash them deterministically', () => {
    const first = tokenService.generateRefreshToken();
    const second = tokenService.generateRefreshToken();

    expect(first).not.toBe(second);
    expect(tokenService.hashRefreshToken(first)).toBe(
      tokenService.hashRefreshToken(first),
    );
    expect(tokenService.hashRefreshToken(first)).not.toContain(first);
  });
});

describe('When we generate OTP codes', () => {
  const generator = new CryptoOtpCodeGenerator('pepper');

  it('should generate 6-digit codes', () => {
    expect(generator.generateOtpCode()).toMatch(/^\d{6}$/);
  });

  it('should match only the right code', () => {
    const hash = generator.hashOtpCode('123456');

    expect(generator.isOtpCodeMatch('123456', hash)).toBe(true);
    expect(generator.isOtpCodeMatch('654321', hash)).toBe(false);
    expect(generator.isOtpCodeMatch('123456', 'short')).toBe(false);
  });

  it('should depend on the pepper', () => {
    expect(new CryptoOtpCodeGenerator('other').hashOtpCode('123456')).not.toBe(
      generator.hashOtpCode('123456'),
    );
  });
});

describe('When we verify a Google ID token (GGL-R01)', () => {
  function verifierReturning(payload: Record<string, unknown> | Error) {
    const client = {
      verifyIdToken: jest.fn(async () => {
        if (payload instanceof Error) {
          throw payload;
        }
        return { getPayload: () => payload };
      }),
    } as unknown as OAuth2Client;
    return {
      client,
      verifier: new GoogleIdentityVerifier('client-id', client),
    };
  }

  it('should return the profile for a verified e-mail and check the audience', async () => {
    const { client, verifier } = verifierReturning({
      sub: 'sub-1',
      email: 'nami@gmail.com',
      email_verified: true,
      name: 'Nami',
      picture: 'https://example.com/nami.png',
    });

    await expect(verifier.verifyIdToken('token')).resolves.toEqual({
      sub: 'sub-1',
      email: 'nami@gmail.com',
      name: 'Nami',
      picture: 'https://example.com/nami.png',
    });
    expect(client.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'token',
      audience: 'client-id',
    });
  });

  it('should reject an unverified e-mail', async () => {
    const { verifier } = verifierReturning({
      sub: 'sub-1',
      email: 'nami@gmail.com',
      email_verified: false,
    });

    await expect(verifier.verifyIdToken('token')).rejects.toMatchObject({
      code: 'GOOGLE_TOKEN_INVALID',
    });
  });

  it('should reject a token the library refuses', async () => {
    const { verifier } = verifierReturning(new Error('Wrong recipient'));

    await expect(verifier.verifyIdToken('token')).rejects.toMatchObject({
      status: 401,
    });
  });
});
