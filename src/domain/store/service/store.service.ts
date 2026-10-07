import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import { Logger } from 'traceability';
import { IClock } from '../../common/clock.interface';
import { BusinessRuleError } from '../../errors/business-rule.error';
import { NotFoundError } from '../../errors/not-found.error';
import {
  EManualStatus,
  IOpeningHour,
  IStore,
} from '../interfaces/store.interface';
import {
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

export class StoreService implements IStoreService {
  private storeRepositoryRead: IStoreRepositoryRead;
  private storeRepositoryWrite: IStoreRepositoryWrite;
  private clock: IClock;

  constructor({
    storeRepositoryRead,
    storeRepositoryWrite,
    clock,
  }: IParamsStoreService) {
    this.storeRepositoryRead = storeRepositoryRead;
    this.storeRepositoryWrite = storeRepositoryWrite;
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
    Logger.info('Store manual status changed', {
      eventName: 'store.manual_status_changed',
      manualStatus,
    });
    return { store: updated, status: updated.statusAt(now) };
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
