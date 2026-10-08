import { PaymentService } from '../../../domain/payment/service/payment.service';
import { SystemClock } from '../../common/system.clock';
import { OrderRepositoryRead } from '../../repository/order/order.repository.read';
import { OrderRepositoryWrite } from '../../repository/order/order.repository.write';
import { OrderTransitionServiceFactory } from './order-transition.service.factory';
import { PaymentGatewayFactory } from './payment-gateway.factory';
import { OrderEventPublisherFactory } from './order-event-publisher.factory';

export class PaymentServiceFactory {
  static create() {
    return new PaymentService({
      orderRepositoryRead: new OrderRepositoryRead(),
      orderRepositoryWrite: new OrderRepositoryWrite(),
      orderTransitionService: OrderTransitionServiceFactory.create(),
      paymentGateway: PaymentGatewayFactory.create(),
      orderEventPublisher: OrderEventPublisherFactory.create(),
      clock: new SystemClock(),
    });
  }
}
