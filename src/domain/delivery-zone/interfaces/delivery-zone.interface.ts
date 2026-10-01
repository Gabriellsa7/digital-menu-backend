export interface IDeliveryZone {
  id: string;
  /** Normalized (lowercase, trimmed, no accents) and used for matching */
  neighborhood: string;
  displayName: string;
  city: string;
  feeInCents: number;
  etaMinMinutes: number;
  etaMaxMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
