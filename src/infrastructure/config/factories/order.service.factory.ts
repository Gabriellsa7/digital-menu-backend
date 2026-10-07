import { OrderService } from '../../../domain/order/service/order.service';
import { SystemClock } from '../../common/system.clock';
import { MongoTransactionRunner } from '../../db/mongo/transaction';
import { CounterRepository } from '../../repository/counter/counter.repository';
import { OrderRepositoryRead } from '../../repository/order/order.repository.read';
import { OrderRepositoryWrite } from '../../repository/order/order.repository.write';
import { CouponServiceFactory } from './coupon.service.factory';
import { CustomerServiceFactory } from './customer.service.factory';
import { OrderPricingServiceFactory } from './order-pricing.service.factory';
import { OrderTransitionServiceFactory } from './order-transition.service.factory';
import { PaymentServiceFactory } from './payment.service.factory';

export class OrderServiceFactory {
  static create() {
    return new OrderService({
      orderRepositoryRead: new OrderRepositoryRead(),
      orderRepositoryWrite: new OrderRepositoryWrite(),
      counterRepository: new CounterRepository(),
      transactionRunner: new MongoTransactionRunner(),
      orderPricingService: OrderPricingServiceFactory.create(),
      customerService: CustomerServiceFactory.create(),
      couponService: CouponServiceFactory.create(),
      paymentService: PaymentServiceFactory.create(),
      orderTransitionService: OrderTransitionServiceFactory.create(),
      clock: new SystemClock(),
    });
  }
}
