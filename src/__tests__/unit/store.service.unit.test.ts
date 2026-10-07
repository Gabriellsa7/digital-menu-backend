import { StoreService } from '../../domain/store/service/store.service';
import { IStoreRepositoryRead } from '../../domain/store/repository/store.repository.read';
import { IStoreRepositoryWrite } from '../../domain/store/repository/store.repository.write';
import {
  EManualStatus,
  EWeekday,
  IStore,
} from '../../domain/store/interfaces/store.interface';
import { Store } from '../../domain/store/store.entity';
import { EStoreImageKind } from '../../domain/store/interfaces/store.service.interface';
import { InMemoryStorageProvider } from '../../infrastructure/storage/in-memory.storage.provider';
import { FixedClock } from '../helpers/fixed.clock';

const THURSDAY_NINE_AM = '2026-10-01T12:00:00.000Z';
const OPENING_HOURS = [
  { weekday: EWeekday.THURSDAY, opensAt: '11:00', closesAt: '23:00' },
];

let clock: FixedClock;
let stored: IStore | null;
let storeRepositoryRead: jest.Mocked<IStoreRepositoryRead>;
let storeRepositoryWrite: jest.Mocked<IStoreRepositoryWrite>;
let storageProvider: InMemoryStorageProvider;
let storeService: StoreService;

function aStore(overrides: Partial<IStore> = {}): IStore {
  return {
    ...Store.withDefaults('store-1', clock.now()),
    openingHours: OPENING_HOURS,
    ...overrides,
  };
}

beforeEach(() => {
  clock = new FixedClock(THURSDAY_NINE_AM);
  stored = aStore();
  storeRepositoryRead = { findStore: jest.fn(async () => stored) };
  storeRepositoryWrite = {
    createStoreIfMissing: jest.fn(async (store) => store),
    updateStore: jest.fn(async ({ set = {}, unset = [] }) => {
      const next = { ...stored!, ...set } as Record<string, unknown>;
      unset.forEach((field) => delete next[field]);
      stored = next as unknown as IStore;
      return stored;
    }),
  };
  storageProvider = new InMemoryStorageProvider();
  storeService = new StoreService({
    storeRepositoryRead,
    storeRepositoryWrite,
    storageProvider,
    clock,
  });
});

describe('When we read the store', () => {
  it('should create it with defaults when it is missing (STO-R01)', async () => {
    stored = null;

    const store = await storeService.getStore();

    expect(store).toMatchObject({
      manualStatus: EManualStatus.AUTO,
      timezone: 'America/Sao_Paulo',
      deliveryEnabled: true,
      pickupEnabled: true,
    });
    expect(storeRepositoryWrite.createStoreIfMissing).toHaveBeenCalled();
  });

  it('should be closed before the opening with the next opening time', async () => {
    const { status } = await storeService.getStoreWithStatus();

    expect(status).toEqual({
      isOpenNow: false,
      manualStatus: EManualStatus.AUTO,
      nextOpeningAt: new Date('2026-10-01T14:00:00.000Z'),
    });
  });

  it('should be open inside an interval with the closing time', async () => {
    clock.advanceSeconds(3 * 3600);

    const { status } = await storeService.getStoreWithStatus();

    expect(status).toMatchObject({
      isOpenNow: true,
      closesAt: new Date('2026-10-02T02:00:00.000Z'),
    });
  });
});

describe('When staff forces the store status (STO-R05)', () => {
  it('should open a closed store until the next boundary', async () => {
    const { status } = await storeService.setManualStatus(
      EManualStatus.FORCED_OPEN,
    );

    expect(status.isOpenNow).toBe(true);
    expect(stored?.manualStatusUntil).toEqual(
      new Date('2026-10-01T14:00:00.000Z'),
    );
  });

  it('should go back to the schedule after the boundary', async () => {
    await storeService.setManualStatus(EManualStatus.FORCED_CLOSED);
    clock.advanceSeconds(3 * 3600);

    const { status } = await storeService.getStoreWithStatus();

    expect(status).toMatchObject({
      isOpenNow: true,
      manualStatus: EManualStatus.AUTO,
    });
  });

  it('should keep the store closed while FORCED_CLOSED beats the schedule', async () => {
    clock.advanceSeconds(3 * 3600);
    await storeService.setManualStatus(EManualStatus.FORCED_CLOSED);

    await expect(storeService.assertAcceptingOrders()).rejects.toMatchObject({
      code: 'STORE_CLOSED',
    });
  });

  it('should clear the expiry when going back to AUTO', async () => {
    await storeService.setManualStatus(EManualStatus.FORCED_OPEN);
    await storeService.setManualStatus(EManualStatus.AUTO);

    expect(stored?.manualStatusUntil).toBeUndefined();
  });
});

describe('When we check whether the store accepts orders (ORD-R01)', () => {
  it('should throw STORE_CLOSED with the next opening time', async () => {
    await expect(storeService.assertAcceptingOrders()).rejects.toMatchObject({
      code: 'STORE_CLOSED',
      details: { nextOpeningAt: '2026-10-01T14:00:00.000Z' },
    });
  });

  it('should return the store while open', async () => {
    clock.advanceSeconds(3 * 3600);

    await expect(storeService.assertAcceptingOrders()).resolves.toMatchObject(
      { id: 'store-1' },
    );
  });
});

describe('When the owner updates the store', () => {
  it('should save only the sent fields', async () => {
    const store = await storeService.updateStore({
      name: 'Burger House',
      minimumOrderInCents: 2000,
    });

    expect(store).toMatchObject({
      name: 'Burger House',
      minimumOrderInCents: 2000,
      slug: 'digital-menu',
    });
  });

  it('should keep at least one fulfillment type enabled (STO-R06)', async () => {
    stored = aStore({ pickupEnabled: false });

    await expect(
      storeService.updateStore({ deliveryEnabled: false }),
    ).rejects.toMatchObject({ code: 'NO_FULFILLMENT_ENABLED' });
  });

  it('should reject an unknown timezone', async () => {
    await expect(
      storeService.updateStore({ timezone: 'Mars/Olympus' }),
    ).rejects.toMatchObject({ code: 'INVALID_TIMEZONE' });
  });

  it('should reject overlapping opening hours (STO-R04)', async () => {
    await expect(
      storeService.setOpeningHours([
        { weekday: EWeekday.MONDAY, opensAt: '10:00', closesAt: '15:00' },
        { weekday: EWeekday.MONDAY, opensAt: '12:00', closesAt: '18:00' },
      ]),
    ).rejects.toMatchObject({ code: 'OVERLAPPING_HOURS' });
  });
});

describe('When the owner uploads a store image', () => {
  const IMAGE = {
    buffer: Buffer.from('logo'),
    mimeType: 'image/webp',
    size: 2048,
  };

  it('should replace the logo and delete the previous asset', async () => {
    const first = await storeService.setStoreImage(EStoreImageKind.LOGO, IMAGE);
    const second = await storeService.setStoreImage(
      EStoreImageKind.LOGO,
      IMAGE,
    );

    expect(second.logoUrl).toEqual(expect.any(String));
    expect(storageProvider.images.has(first.logoPublicId!)).toBe(false);
    expect(storageProvider.images.has(second.logoPublicId!)).toBe(true);
  });

  it('should keep the logo when the banner changes', async () => {
    await storeService.setStoreImage(EStoreImageKind.LOGO, IMAGE);

    const store = await storeService.setStoreImage(
      EStoreImageKind.BANNER,
      IMAGE,
    );

    expect(store.logoUrl).toBeDefined();
    expect(store.bannerUrl).toBeDefined();
  });
});
