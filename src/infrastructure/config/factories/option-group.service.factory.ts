import { OptionGroupService } from '../../../domain/option-group/service/option-group.service';
import { ProductUsage } from '../../repository/product/product.usage';
import { SystemClock } from '../../common/system.clock';
import { OptionGroupRepositoryRead } from '../../repository/option-group/option-group.repository.read';
import { OptionGroupRepositoryWrite } from '../../repository/option-group/option-group.repository.write';
import { StoreEventPublisherFactory } from './store-event-publisher.factory';

export class OptionGroupServiceFactory {
  static create() {
    return new OptionGroupService({
      optionGroupRepositoryRead: new OptionGroupRepositoryRead(),
      optionGroupRepositoryWrite: new OptionGroupRepositoryWrite(),
      optionGroupUsage: new ProductUsage(),
      storeEventPublisher: StoreEventPublisherFactory.create(),
      clock: new SystemClock(),
    });
  }
}
