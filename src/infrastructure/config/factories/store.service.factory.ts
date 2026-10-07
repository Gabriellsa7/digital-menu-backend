import { StoreService } from '../../../domain/store/service/store.service';
import { SystemClock } from '../../common/system.clock';
import { StoreRepositoryRead } from '../../repository/store/store.repository.read';
import { StoreRepositoryWrite } from '../../repository/store/store.repository.write';

export class StoreServiceFactory {
  static create() {
    return new StoreService({
      storeRepositoryRead: new StoreRepositoryRead(),
      storeRepositoryWrite: new StoreRepositoryWrite(),
      clock: new SystemClock(),
    });
  }
}
