import { StoreService } from '../../../domain/store/service/store.service';
import { SystemClock } from '../../common/system.clock';
import { StoreRepositoryRead } from '../../repository/store/store.repository.read';
import { StoreRepositoryWrite } from '../../repository/store/store.repository.write';
import { StorageProviderFactory } from './storage.provider.factory';
import { StoreEventPublisherFactory } from './store-event-publisher.factory';

export class StoreServiceFactory {
  static create() {
    return new StoreService({
      storeRepositoryRead: new StoreRepositoryRead(),
      storeRepositoryWrite: new StoreRepositoryWrite(),
      storageProvider: StorageProviderFactory.create(),
      storeEventPublisher: StoreEventPublisherFactory.create(),
      clock: new SystemClock(),
    });
  }
}
