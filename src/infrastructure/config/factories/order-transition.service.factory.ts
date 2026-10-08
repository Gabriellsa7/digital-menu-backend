import { OrderTransitionService } from '../../../domain/order/service/order-transition.service';
import { SystemClock } from '../../common/system.clock';
import { MongoTransactionRunner } from '../../db/mongo/transaction';
import { OrderRepositoryWrite } from '../../repository/order/order.repository.write';
import { CouponServiceFactory } from './coupon.service.factory';
import { PaymentGatewayFactory } from './payment-gateway.factory';
import { OrderEventPublisherFactory } from './order-event-publisher.factory';

export class OrderTransitionServiceFactory {
  static create() {
    return new OrderTransitionService({
      orderRepositoryWrite: new OrderRepositoryWrite(),
      couponService: CouponServiceFactory.create(),
      paymentGateway: PaymentGatewayFactory.create(),
      transactionRunner: new MongoTransactionRunner(),
      orderEventPublisher: OrderEventPublisherFactory.create(),
      clock: new SystemClock(),
    });
  }
}
