import { CustomerService } from '../../../domain/customer/service/customer.service';
import { SystemClock } from '../../common/system.clock';
import { PendingDeliveryZoneResolver } from '../../delivery-zone/pending.delivery-zone.resolver';
import { CustomerRepositoryRead } from '../../repository/customer/customer.repository.read';
import { CustomerRepositoryWrite } from '../../repository/customer/customer.repository.write';

export class CustomerServiceFactory {
  static create() {
    return new CustomerService({
      customerRepositoryRead: new CustomerRepositoryRead(),
      customerRepositoryWrite: new CustomerRepositoryWrite(),
      // TODO(delivery-zone): swap for a resolver backed by the delivery-zone service
      deliveryZoneResolver: new PendingDeliveryZoneResolver(),
      clock: new SystemClock(),
    });
  }
}
