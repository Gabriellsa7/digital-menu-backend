import { BcryptPasswordHasher } from '../../infrastructure/security/bcrypt.password-hasher';

const passwordHasher = new BcryptPasswordHasher(4);

describe('When we hash a staff password with bcrypt', () => {
  it('should never return the plain password', async () => {
    const passwordHash = await passwordHasher.hashPassword('secret123');

    expect(passwordHash).not.toContain('secret123');
    expect(passwordHash).toMatch(/^\$2[aby]\$04\$/);
  });

  it('should match only the original password', async () => {
    const passwordHash = await passwordHasher.hashPassword('secret123');

    await expect(
      passwordHasher.isPasswordMatch('secret123', passwordHash),
    ).resolves.toBe(true);
    await expect(
      passwordHasher.isPasswordMatch('secret124', passwordHash),
    ).resolves.toBe(false);
  });
});
