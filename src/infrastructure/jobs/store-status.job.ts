import { IStoreEventPublisher } from '../../domain/store/events/store.event.publisher';
import { IStoreStatus } from '../../domain/store/interfaces/store.interface';
import { IStoreService } from '../../domain/store/interfaces/store.service.interface';
import { IJob } from './job.interface';

export class StoreStatusJob implements IJob {
  public readonly name = 'store-status';
  private lastStatus?: IStoreStatus;

  constructor(
    private readonly storeService: IStoreService,
    private readonly storeEventPublisher: IStoreEventPublisher,
  ) {}

  async run(): Promise<void> {
    const status = await this.storeService.refreshStoreStatus();
    const hasChanged =
      this.lastStatus !== undefined &&
      (this.lastStatus.isOpenNow !== status.isOpenNow ||
        this.lastStatus.manualStatus !== status.manualStatus);
    if (hasChanged) {
      this.storeEventPublisher.publishStoreStatusChanged(status);
    }
    this.lastStatus = status;
  }
}
