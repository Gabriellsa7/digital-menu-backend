import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import { Logger } from 'traceability';
import { IClock } from '../../common/clock.interface';
import { assertValidImage } from '../../common/image';
import {
  IImageFile,
  IStorageProvider,
} from '../../common/storage.provider.interface';
import { BusinessRuleError } from '../../errors/business-rule.error';
import { NotFoundError } from '../../errors/not-found.error';
import { IStoreEventPublisher } from '../events/store.event.publisher';
import {
  EManualStatus,
  IOpeningHour,
  IStore,
  IStoreStatus,
} from '../interfaces/store.interface';
import {
  EStoreImageKind,
  IParamsStoreService,
  IParamsUpdateStore,
  IStoreService,
  IStoreWithStatus,
} from '../interfaces/store.service.interface';
import {
  assertValidOpeningHours,
  nextBoundaryAfter,
} from '../policies/opening-hours.policy';
import { IStoreRepositoryRead } from '../repository/store.repository.read';
import {
  IParamsUpdateStoreFields,
  IStoreRepositoryWrite,
} from '../repository/store.repository.write';
import { Store } from '../store.entity';

const STORE_IMAGES_FOLDER = 'digital-menu/store';

export class StoreService implements IStoreService {
  private storeRepositoryRead: IStoreRepositoryRead;
  private storeRepositoryWrite: IStoreRepositoryWrite;
  private storageProvider: IStorageProvider;
  private storeEventPublisher: IStoreEventPublisher;
  private clock: IClock;

  constructor({
    storeRepositoryRead,
    storeRepositoryWrite,
    storageProvider,
    storeEventPublisher,
    clock,
  }: IParamsStoreService) {
    this.storeRepositoryRead = storeRepositoryRead;
    this.storeRepositoryWrite = storeRepositoryWrite;
    this.storageProvider = storageProvider;
    this.storeEventPublisher = storeEventPublisher;
    this.clock = clock;
  }

  @ErrorHandler()
  async getStore(): Promise<IStore> {
    const store = await this.storeRepositoryRead.findStore();
    if (store) {
      return store;
    }
    const created = await this.storeRepositoryWrite.createStoreIfMissing(
      Store.withDefaults(randomUUID(), this.clock.now()),
    );
    Logger.info('Store bootstrapped with defaults', {
      eventName: 'store.bootstrapped',
    });
    return created;
  }

  @ErrorHandler()
  async getStoreWithStatus(): Promise<IStoreWithStatus> {
    const store = new Store(await this.getStore());
    return { store, status: store.statusAt(this.clock.now()) };
  }

  @ErrorHandler()
  async updateStore(params: IParamsUpdateStore): Promise<IStore> {
    const store = await this.getStore();
    Store.assertFulfillmentEnabled(
      params.deliveryEnabled ?? store.deliveryEnabled,
      params.pickupEnabled ?? store.pickupEnabled,
    );
    if (params.timezone !== undefined) {
      this.assertValidTimezone(params.timezone);
    }
    const set = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined),
    );

    return this.updateStoreFields({ set });
  }

  @ErrorHandler()
  async setOpeningHours(openingHours: IOpeningHour[]): Promise<IStore> {
    await this.getStore();
    assertValidOpeningHours(openingHours);

    return this.updateStoreFields({ set: { openingHours } });
  }

  @ErrorHandler()
  async setManualStatus(
    manualStatus: EManualStatus,
  ): Promise<IStoreWithStatus> {
    const store = await this.getStore();
    const now = this.clock.now();
    const manualStatusUntil =
      manualStatus === EManualStatus.AUTO
        ? undefined
        : nextBoundaryAfter(store.openingHours, store.timezone, now);

    const updated = new Store(
      await this.updateStoreFields({
        set: { manualStatus, ...(manualStatusUntil && { manualStatusUntil }) },
        ...(!manualStatusUntil && { unset: ['manualStatusUntil'] }),
      }),
    );
    const status = updated.statusAt(now);
    this.storeEventPublisher.publishStoreStatusChanged(status);
    Logger.info('Store manual status changed', {
      eventName: 'store.manual_status_changed',
      manualStatus,
    });
    return { store: updated, status };
  }

  @ErrorHandler()
  async assertAcceptingOrders(): Promise<IStore> {
    const { store, status } = await this.getStoreWithStatus();
    if (!status.isOpenNow) {
      throw new BusinessRuleError('Store is closed', 'STORE_CLOSED', {
        ...(status.nextOpeningAt && {
          nextOpeningAt: status.nextOpeningAt.toISOString(),
        }),
      });
    }
    return store;
  }

  @ErrorHandler()
  async refreshStoreStatus(): Promise<IStoreStatus> {
    const store = new Store(await this.getStore());
    const now = this.clock.now();
    const status = store.statusAt(now);
    if (store.manualStatus !== status.manualStatus) {
      await this.updateStoreFields({
        set: { manualStatus: EManualStatus.AUTO },
        unset: ['manualStatusUntil'],
      });
      Logger.info('Store manual status expired', {
        eventName: 'store.manual_status_expired',
        manualStatus: store.manualStatus,
      });
    }
    return status;
  }

  @ErrorHandler()
  async setStoreImage(
    kind: EStoreImageKind,
    file?: IImageFile,
  ): Promise<IStore> {
    assertValidImage(file);
    const store = await this.getStore();
    const uploaded = await this.storageProvider.uploadImage({
      file,
      folder: STORE_IMAGES_FOLDER,
    });
    const previousPublicId =
      kind === EStoreImageKind.LOGO ? store.logoPublicId : store.bannerPublicId;

    const updated = await this.updateStoreFields({
      set:
        kind === EStoreImageKind.LOGO
          ? { logoUrl: uploaded.url, logoPublicId: uploaded.publicId }
          : { bannerUrl: uploaded.url, bannerPublicId: uploaded.publicId },
    });
    if (previousPublicId) {
      await this.storageProvider.deleteImage(previousPublicId);
    }
    return updated;
  }

  private assertValidTimezone(timezone: string): void {
    if (!DateTime.now().setZone(timezone).isValid) {
      throw new BusinessRuleError(
        `Unknown timezone "${timezone}"`,
        'INVALID_TIMEZONE',
      );
    }
  }

  private async updateStoreFields(
    fields: IParamsUpdateStoreFields,
  ): Promise<IStore> {
    const updated = await this.storeRepositoryWrite.updateStore(fields);

    return updated ? updated : this.throwStoreNotFound();
  }

  private throwStoreNotFound(): never {
    throw new NotFoundError('Store not found');
  }
}
