export interface IGoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface IGoogleIdentityVerifier {
  verifyIdToken(idToken: string): Promise<IGoogleProfile>;
}
