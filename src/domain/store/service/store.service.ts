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
  IParamsCreateStore,
  IParamsStoreService,
  IParamsUpdateStore,
  IStoreService,
  IStoreWithStatus,
} from '../interfaces/store.service.interface';
import {
  assertValidOpeningHours,
  nextBoundaryAfter,
} from '../policies/opening-hours.policy';
import { slugify } from '../policies/slug.policy';
import { IStoreRepositoryRead } from '../repository/store.repository.read';
import {
  IParamsUpdateStoreFields,
  IStoreRepositoryWrite,
} from '../repository/store.repository.write';
import { Store } from '../store.entity';

const STORE_IMAGES_FOLDER = 'digital-menu/stores';
const DEFAULT_STORE_NAME = 'Digital Menu';

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
  async createStore({
    name,
    slug,
    isPublished = false,
    ...settings
  }: IParamsCreateStore): Promise<IStore> {
    const storeSlug = slug ?? slugify(name);
    const defaults = Store.withDefaults(randomUUID(), this.clock.now(), {
      name: name.trim(),
      slug: storeSlug,
    });
    Store.assertFulfillmentEnabled(
      settings.deliveryEnabled ?? defaults.deliveryEnabled,
      settings.pickupEnabled ?? defaults.pickupEnabled,
    );
    const created = await this.storeRepositoryWrite.createStore(
      new Store({ ...defaults, ...this.definedFields(settings), isPublished }),
    );
    Logger.info('Store created', {
      eventName: 'store.created',
      storeId: created.id,
      slug: created.slug,
    });
    return created;
  }

  @ErrorHandler()
  async ensureDefaultStore(): Promise<IStore> {
    const store = await this.storeRepositoryRead.findFirstStore();

    return store
      ? store
      : this.createStore({ name: DEFAULT_STORE_NAME, isPublished: true });
  }

  @ErrorHandler()
  async getStore(storeId: string): Promise<IStore> {
    const store = await this.storeRepositoryRead.findStoreById(storeId);

    return store ? store : this.throwStoreNotFound();
  }

  @ErrorHandler()
  async getStoreWithStatus(storeId: string): Promise<IStoreWithStatus> {
    return this.withStatus(await this.getStore(storeId));
  }

  @ErrorHandler()
  async listActiveStores(): Promise<IStore[]> {
    return this.storeRepositoryRead.listActiveStores();
  }

  @ErrorHandler()
  async updateStore(
    storeId: string,
    params: IParamsUpdateStore,
  ): Promise<IStore> {
    const store = await this.getStore(storeId);
    Store.assertFulfillmentEnabled(
      params.deliveryEnabled ?? store.deliveryEnabled,
      params.pickupEnabled ?? store.pickupEnabled,
    );
    if (params.timezone !== undefined) {
      this.assertValidTimezone(params.timezone);
    }
    return this.updateStoreFields(storeId, { set: this.definedFields(params) });
  }

  @ErrorHandler()
  async setOpeningHours(
    storeId: string,
    openingHours: IOpeningHour[],
  ): Promise<IStore> {
    await this.getStore(storeId);
    assertValidOpeningHours(openingHours);

    return this.updateStoreFields(storeId, { set: { openingHours } });
  }

  @ErrorHandler()
  async setManualStatus(
    storeId: string,
    manualStatus: EManualStatus,
  ): Promise<IStoreWithStatus> {
    const store = await this.getStore(storeId);
    const now = this.clock.now();
    const manualStatusUntil =
      manualStatus === EManualStatus.AUTO
        ? undefined
        : nextBoundaryAfter(store.openingHours, store.timezone, now);

    const updated = new Store(
      await this.updateStoreFields(storeId, {
        set: { manualStatus, ...(manualStatusUntil && { manualStatusUntil }) },
        ...(!manualStatusUntil && { unset: ['manualStatusUntil'] }),
      }),
    );
    const status = updated.statusAt(now);
    this.storeEventPublisher.publishStoreStatusChanged(status);
    Logger.info('Store manual status changed', {
      eventName: 'store.manual_status_changed',
      storeId,
      manualStatus,
    });
    return { store: updated, status };
  }

  @ErrorHandler()
  async assertAcceptingOrders(storeId: string): Promise<IStore> {
    const { store, status } = await this.getStoreWithStatus(storeId);
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
  async refreshStoreStatus(storeId: string): Promise<IStoreStatus> {
    const store = new Store(await this.getStore(storeId));
    const now = this.clock.now();
    const status = store.statusAt(now);
    if (store.manualStatus !== status.manualStatus) {
      await this.updateStoreFields(storeId, {
        set: { manualStatus: EManualStatus.AUTO },
        unset: ['manualStatusUntil'],
      });
      Logger.info('Store manual status expired', {
        eventName: 'store.manual_status_expired',
        storeId,
        manualStatus: store.manualStatus,
      });
    }
    return status;
  }

  @ErrorHandler()
  async setStoreImage(
    storeId: string,
    kind: EStoreImageKind,
    file?: IImageFile,
  ): Promise<IStore> {
    assertValidImage(file);
    const store = await this.getStore(storeId);
    const uploaded = await this.storageProvider.uploadImage({
      file,
      folder: `${STORE_IMAGES_FOLDER}/${storeId}`,
    });
    const previousPublicId =
      kind === EStoreImageKind.LOGO ? store.logoPublicId : store.bannerPublicId;

    const updated = await this.updateStoreFields(storeId, {
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

  private withStatus(store: IStore): IStoreWithStatus {
    const entity = new Store(store);
    return { store: entity, status: entity.statusAt(this.clock.now()) };
  }

  private definedFields<T extends object>(params: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  private async updateStoreFields(
    storeId: string,
    fields: IParamsUpdateStoreFields,
  ): Promise<IStore> {
    const updated = await this.storeRepositoryWrite.updateStore(
      storeId,
      fields,
    );

    return updated ? updated : this.throwStoreNotFound();
  }

  private throwStoreNotFound(): never {
    throw new NotFoundError('Store not found');
  }
}
