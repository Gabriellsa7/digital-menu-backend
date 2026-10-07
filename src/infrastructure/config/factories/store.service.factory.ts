import { StoreService } from '../../../domain/store/service/store.service';
import { SystemClock } from '../../common/system.clock';
import { StoreRepositoryRead } from '../../repository/store/store.repository.read';
import { StoreRepositoryWrite } from '../../repository/store/store.repository.write';
import { StorageProviderFactory } from './storage.provider.factory';

export class StoreServiceFactory {
  static create() {
    return new StoreService({
      storeRepositoryRead: new StoreRepositoryRead(),
      storeRepositoryWrite: new StoreRepositoryWrite(),
      storageProvider: StorageProviderFactory.create(),
      clock: new SystemClock(),
    });
  }
}
