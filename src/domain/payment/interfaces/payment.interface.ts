export enum EPaymentMethod {
  PIX = 'PIX',
  CARD_ONLINE = 'CARD_ONLINE',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  CARD_ON_DELIVERY = 'CARD_ON_DELIVERY',
}

export enum EPaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
  ON_DELIVERY = 'ON_DELIVERY',
}

export interface IPixCharge {
  copyPaste: string;
  qrCodeBase64: string;
  expiresAt: Date;
}

export interface ICardInfo {
  brand: string;
  last4: string;
}

export interface IPayment {
  method: EPaymentMethod;
  status: EPaymentStatus;
  changeForInCents?: number;
  pix?: IPixCharge;
  card?: ICardInfo;
  failedAttempts: number;
  transactionId?: string;
  paidAt?: Date;
}
