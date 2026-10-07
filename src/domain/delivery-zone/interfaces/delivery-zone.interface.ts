export interface IDeliveryZone {
  id: string;
  neighborhood: string;
  displayName: string;
  city: string;
  cityKey: string;
  feeInCents: number;
  etaMinMinutes: number;
  etaMaxMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
