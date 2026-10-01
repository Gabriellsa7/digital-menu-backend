export interface IOtp {
  id: string;
  phone: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
