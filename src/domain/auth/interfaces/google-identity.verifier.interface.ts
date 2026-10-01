export interface IGoogleProfile {
  /** Stable Google account id */
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface IGoogleIdentityVerifier {
  /**
   * Verify a Google ID token (GGL-R01)
   * @throws UnauthorizedError when the token is invalid, expired, issued for
   * another client or the e-mail is not verified
   */
  verifyIdToken(idToken: string): Promise<IGoogleProfile>;
}
