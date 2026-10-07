import { CustomerService } from '../../../domain/customer/service/customer.service';
import { SystemClock } from '../../common/system.clock';
import { CustomerRepositoryRead } from '../../repository/customer/customer.repository.read';
import { CustomerRepositoryWrite } from '../../repository/customer/customer.repository.write';
import { DeliveryZoneServiceFactory } from './delivery-zone.service.factory';

export class CustomerServiceFactory {
  static create() {
    return new CustomerService({
      customerRepositoryRead: new CustomerRepositoryRead(),
      customerRepositoryWrite: new CustomerRepositoryWrite(),
      deliveryZoneResolver: DeliveryZoneServiceFactory.create(),
      clock: new SystemClock(),
    });
  }
}
