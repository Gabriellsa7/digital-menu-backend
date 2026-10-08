import { IPaymentGateway } from '../../../domain/payment/interfaces/payment.gateway.interface';
import { MockPaymentGateway } from '../../payment/mock.payment.gateway';

let paymentGateway: IPaymentGateway | undefined;

export class PaymentGatewayFactory {
  static create(): IPaymentGateway {
    paymentGateway ??= new MockPaymentGateway();
    return paymentGateway;
  }
}
