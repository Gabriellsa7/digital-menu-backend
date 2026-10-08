export interface IParamsCreatePixCharge {
  orderId: string;
  orderNumber: number;
  amountInCents: number;
}

export interface IPixChargeResult {
  copyPaste: string;
  qrCodeBase64: string;
  transactionId: string;
}

export interface ICardData {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}

export interface IParamsChargeCard {
  orderId: string;
  amountInCents: number;
  card: ICardData;
}

export enum ECardChargeOutcome {
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  INVALID = 'INVALID',
}

export interface ICardChargeResult {
  outcome: ECardChargeOutcome;
  brand: string;
  last4: string;
  transactionId?: string;
}

export interface IPaymentGateway {
  createPixCharge(params: IParamsCreatePixCharge): Promise<IPixChargeResult>;
  chargeCard(params: IParamsChargeCard): Promise<ICardChargeResult>;
  refund(transactionId: string): Promise<void>;
}
