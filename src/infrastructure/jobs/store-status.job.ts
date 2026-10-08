import { IStoreEventPublisher } from '../../domain/store/events/store.event.publisher';
import { IStoreStatus } from '../../domain/store/interfaces/store.interface';
import { IStoreService } from '../../domain/store/interfaces/store.service.interface';
import { IJob } from './job.interface';

export class StoreStatusJob implements IJob {
  public readonly name = 'store-status';
  private readonly lastStatuses = new Map<string, IStoreStatus>();

  constructor(
    private readonly storeService: IStoreService,
    private readonly storeEventPublisher: IStoreEventPublisher,
  ) {}

  async run(): Promise<void> {
    const stores = await this.storeService.listActiveStores();
    for (const { id } of stores) {
      const status = await this.storeService.refreshStoreStatus(id);
      const lastStatus = this.lastStatuses.get(id);
      const hasChanged =
        lastStatus !== undefined &&
        (lastStatus.isOpenNow !== status.isOpenNow ||
          lastStatus.manualStatus !== status.manualStatus);
      if (hasChanged) {
        this.storeEventPublisher.publishStoreStatusChanged(status);
      }
      this.lastStatuses.set(id, status);
    }
  }
}
