import { ECardChargeOutcome } from '../../domain/payment/interfaces/payment.gateway.interface';
import { MockPaymentGateway } from '../../infrastructure/payment/mock.payment.gateway';

const gateway = new MockPaymentGateway();
const CARD = { holder: 'NAMI', expiry: '12/30', cvv: '123' };

describe('When the mock gateway creates a Pix charge (PAY-R01)', () => {
  it('should return a copy-paste payload and a PNG QR code', async () => {
    const charge = await gateway.createPixCharge({
      orderId: 'order-1',
      orderNumber: 42,
      amountInCents: 4190,
    });

    expect(charge.copyPaste).toContain('41.90');
    expect(charge.copyPaste).toContain('000042');
    expect(
      Buffer.from(charge.qrCodeBase64, 'base64').subarray(1, 4).toString(),
    ).toBe('PNG');
    expect(charge.transactionId).toMatch(/^pix_/);
  });
});

describe('When the mock gateway charges a card (PAY-R03)', () => {
  it.each([
    ['4242 4242 4242 4242', ECardChargeOutcome.APPROVED, 'VISA', '4242'],
    ['4000 0000 0000 0002', ECardChargeOutcome.DECLINED, 'VISA', '0002'],
    ['5555 5555 5555 4444', ECardChargeOutcome.INVALID, 'MASTERCARD', '4444'],
  ])('should answer %s with %s', async (number, outcome, brand, last4) => {
    const result = await gateway.chargeCard({
      orderId: 'order-1',
      amountInCents: 1000,
      card: { ...CARD, number },
    });

    expect(result).toMatchObject({ outcome, brand, last4 });
    expect(JSON.stringify(result)).not.toContain(number.replace(/ /g, ''));
  });
});
