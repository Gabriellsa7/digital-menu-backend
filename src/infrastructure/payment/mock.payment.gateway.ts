import { randomUUID } from 'crypto';
import QRCode from 'qrcode';
import { Logger } from 'traceability';
import {
  ECardChargeOutcome,
  ICardChargeResult,
  IParamsChargeCard,
  IParamsCreatePixCharge,
  IPaymentGateway,
  IPixChargeResult,
} from '../../domain/payment/interfaces/payment.gateway.interface';

export const APPROVED_TEST_CARD = '4242424242424242';
export const DECLINED_TEST_CARD = '4000000000000002';

const CARD_BRANDS: [RegExp, string][] = [
  [/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650)/, 'ELO'],
  [/^4/, 'VISA'],
  [/^(5[1-5]|2[2-7])/, 'MASTERCARD'],
  [/^3[47]/, 'AMEX'],
];

function detectBrand(cardNumber: string): string {
  return (
    CARD_BRANDS.find(([pattern]) => pattern.test(cardNumber))?.[1] ?? 'UNKNOWN'
  );
}

function pixPayload(orderNumber: number, amountInCents: number): string {
  const amount = (amountInCents / 100).toFixed(2);
  const reference = String(orderNumber).padStart(6, '0');
  return `00020126360014BR.GOV.BCB.PIX0114DIGITALMENU520400005303986540${amount.length}${amount}5802BR5911DIGITALMENU6009SAO PAULO62100506${reference}6304MOCK`;
}

export class MockPaymentGateway implements IPaymentGateway {
  async createPixCharge({
    orderNumber,
    amountInCents,
  }: IParamsCreatePixCharge): Promise<IPixChargeResult> {
    const copyPaste = pixPayload(orderNumber, amountInCents);
    const dataUrl = await QRCode.toDataURL(copyPaste);
    return {
      copyPaste,
      qrCodeBase64: dataUrl.replace(/^data:image\/png;base64,/, ''),
      transactionId: `pix_${randomUUID()}`,
    };
  }

  async chargeCard({ card }: IParamsChargeCard): Promise<ICardChargeResult> {
    const cardNumber = card.number.replace(/\D/g, '');
    const result = {
      brand: detectBrand(cardNumber),
      last4: cardNumber.slice(-4),
    };
    if (cardNumber === APPROVED_TEST_CARD) {
      return {
        ...result,
        outcome: ECardChargeOutcome.APPROVED,
        transactionId: `card_${randomUUID()}`,
      };
    }
    return {
      ...result,
      outcome:
        cardNumber === DECLINED_TEST_CARD
          ? ECardChargeOutcome.DECLINED
          : ECardChargeOutcome.INVALID,
    };
  }

  async refund(transactionId: string): Promise<void> {
    Logger.info('Payment refunded (mock)', {
      eventName: 'payment.refunded',
      transactionId,
    });
  }
}
