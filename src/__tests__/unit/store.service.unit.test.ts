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
const STORE_ID = 'store-1';
const OPENING_HOURS = [
  { weekday: EWeekday.THURSDAY, opensAt: '11:00', closesAt: '23:00' },
];

let clock: FixedClock;
let stored: IStore | null;
let others: IStore[];
let storeRepositoryRead: jest.Mocked<IStoreRepositoryRead>;
let storeRepositoryWrite: jest.Mocked<IStoreRepositoryWrite>;
let storageProvider: InMemoryStorageProvider;
let storeReadiness: { countSellableProducts: jest.Mock };
let storeService: StoreService;

function aStore(overrides: Partial<IStore> = {}): IStore {
  return {
    ...Store.withDefaults(STORE_ID, clock.now(), {
      name: 'Digital Menu',
      slug: 'digital-menu',
    }),
    openingHours: OPENING_HOURS,
    ...overrides,
  };
}

function allStores(): IStore[] {
  return [...(stored ? [stored] : []), ...others];
}

beforeEach(() => {
  clock = new FixedClock(THURSDAY_NINE_AM);
  stored = aStore();
  others = [];
  storeRepositoryRead = {
    findStoreById: jest.fn(
      async (id) => allStores().find((store) => store.id === id) ?? null,
    ),
    findStoreBySlug: jest.fn(
      async (slug) => allStores().find((store) => store.slug === slug) ?? null,
    ),
    findFirstStore: jest.fn(async () => allStores()[0] ?? null),
    listActiveStores: jest.fn(async () => allStores()),
  };
  storeRepositoryWrite = {
    createStore: jest.fn(async (store) => {
      others.push(store);
      return store;
    }),
    deleteStore: jest.fn(),
    updateStore: jest.fn(async (id, { set = {}, unset = [] }) => {
      if (id !== stored?.id) {
        return null;
      }
      const next = { ...stored, ...set } as Record<string, unknown>;
      unset.forEach((field) => delete next[field]);
      stored = next as unknown as IStore;
      return stored;
    }),
  };
  storageProvider = new InMemoryStorageProvider();
  storeReadiness = { countSellableProducts: jest.fn().mockResolvedValue(3) };
  storeService = new StoreService({
    storeRepositoryRead,
    storeRepositoryWrite,
    storageProvider,
    storeEventPublisher: {
      publishStoreStatusChanged: jest.fn(),
      publishProductAvailabilityChanged: jest.fn(),
      publishOptionAvailabilityChanged: jest.fn(),
    },
    storeReadiness,
    clock,
  });
});

describe('When we create a store (TEN-R01)', () => {
  it('should derive a free slug from the name and start unpublished', async () => {
    const created = await storeService.createStore({ name: 'Digital Menu' });

    expect(created).toMatchObject({
      slug: 'digital-menu-2',
      isPublished: false,
      isActive: true,
      manualStatus: EManualStatus.AUTO,
      timezone: 'America/Sao_Paulo',
      deliveryEnabled: false,
      pickupEnabled: true,
    });
  });

  it('should reject a slug that is already in use', async () => {
    await expect(
      storeService.createStore({ name: 'Other', slug: 'digital-menu' }),
    ).rejects.toMatchObject({ code: 'SLUG_TAKEN' });
  });

  it('should reject a reserved slug', async () => {
    await expect(
      storeService.createStore({ name: 'Other', slug: 'checkout' }),
    ).rejects.toMatchObject({ code: 'SLUG_RESERVED' });
  });

  it('should reuse the first store as the default store', async () => {
    await expect(storeService.ensureDefaultStore()).resolves.toMatchObject({
      id: STORE_ID,
    });
    expect(storeRepositoryWrite.createStore).not.toHaveBeenCalled();
  });

  it('should create a published default store when none exists', async () => {
    stored = null;

    const store = await storeService.ensureDefaultStore();

    expect(store).toMatchObject({ slug: 'digital-menu', isPublished: true });
  });
});

describe('When anyone reads a store by slug (TEN-R06)', () => {
  it('should find a published store', async () => {
    stored = aStore({ isPublished: true });

    const { store } = await storeService.getPublishedStoreBySlug('digital-menu');

    expect(store.id).toBe(STORE_ID);
  });

  it.each([
    ['unpublished', { isPublished: false }],
    ['inactive', { isPublished: true, isActive: false }],
  ])('should hide an %s store as STORE_NOT_FOUND', async (_case, flags) => {
    stored = aStore(flags);

    await expect(
      storeService.getPublishedStoreBySlug('digital-menu'),
    ).rejects.toMatchObject({ status: 404, code: 'STORE_NOT_FOUND' });
  });

  it('should answer STORE_NOT_FOUND for an unknown slug', async () => {
    await expect(
      storeService.getPublishedStoreBySlug('nope'),
    ).rejects.toMatchObject({ code: 'STORE_NOT_FOUND' });
  });
});

describe('When we read the store', () => {
  it('should throw NotFoundError for an unknown store id', async () => {
    await expect(storeService.getStore('missing')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('should be closed before the opening with the next opening time', async () => {
    const { status } = await storeService.getStoreWithStatus(STORE_ID);

    expect(status).toEqual({
      isOpenNow: false,
      manualStatus: EManualStatus.AUTO,
      nextOpeningAt: new Date('2026-10-01T14:00:00.000Z'),
    });
  });

  it('should be open inside an interval with the closing time', async () => {
    clock.advanceSeconds(3 * 3600);

    const { status } = await storeService.getStoreWithStatus(STORE_ID);

    expect(status).toMatchObject({
      isOpenNow: true,
      closesAt: new Date('2026-10-02T02:00:00.000Z'),
    });
  });
});

describe('When staff forces the store status (STO-R05)', () => {
  it('should open a closed store until the next boundary', async () => {
    const { status } = await storeService.setManualStatus(
      STORE_ID,
      EManualStatus.FORCED_OPEN,
    );

    expect(status.isOpenNow).toBe(true);
    expect(stored?.manualStatusUntil).toEqual(
      new Date('2026-10-01T14:00:00.000Z'),
    );
  });

  it('should go back to the schedule after the boundary', async () => {
    await storeService.setManualStatus(STORE_ID, EManualStatus.FORCED_CLOSED);
    clock.advanceSeconds(3 * 3600);

    const { status } = await storeService.getStoreWithStatus(STORE_ID);

    expect(status).toMatchObject({
      isOpenNow: true,
      manualStatus: EManualStatus.AUTO,
    });
  });

  it('should keep the store closed while FORCED_CLOSED beats the schedule', async () => {
    clock.advanceSeconds(3 * 3600);
    await storeService.setManualStatus(STORE_ID, EManualStatus.FORCED_CLOSED);

    await expect(storeService.assertAcceptingOrders(STORE_ID)).rejects.toMatchObject({
      code: 'STORE_CLOSED',
    });
  });

  it('should clear the expiry when going back to AUTO', async () => {
    await storeService.setManualStatus(STORE_ID, EManualStatus.FORCED_OPEN);
    await storeService.setManualStatus(STORE_ID, EManualStatus.AUTO);

    expect(stored?.manualStatusUntil).toBeUndefined();
  });
});

describe('When we check whether the store accepts orders (ORD-R01)', () => {
  it('should throw STORE_CLOSED with the next opening time', async () => {
    await expect(storeService.assertAcceptingOrders(STORE_ID)).rejects.toMatchObject({
      code: 'STORE_CLOSED',
      details: { nextOpeningAt: '2026-10-01T14:00:00.000Z' },
    });
  });

  it('should return the store while open', async () => {
    clock.advanceSeconds(3 * 3600);

    await expect(storeService.assertAcceptingOrders(STORE_ID)).resolves.toMatchObject(
      { id: 'store-1' },
    );
  });
});

describe('When the owner updates the store', () => {
  it('should save only the sent fields', async () => {
    const store = await storeService.updateStore(STORE_ID, {
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
      storeService.updateStore(STORE_ID, { deliveryEnabled: false }),
    ).rejects.toMatchObject({ code: 'NO_FULFILLMENT_ENABLED' });
  });

  it('should change the slug when it is free (TEN-R02)', async () => {
    const store = await storeService.updateStore(STORE_ID, {
      slug: 'casa-brasa',
    });

    expect(store.slug).toBe('casa-brasa');
  });

  it('should reject a slug used by another store (TEN-R01)', async () => {
    others = [aStore({ id: 'store-2', slug: 'casa-brasa' })];

    await expect(
      storeService.updateStore(STORE_ID, { slug: 'casa-brasa' }),
    ).rejects.toMatchObject({ status: 409, code: 'SLUG_TAKEN' });
  });

  it('should reject an unknown timezone', async () => {
    await expect(
      storeService.updateStore(STORE_ID, { timezone: 'Mars/Olympus' }),
    ).rejects.toMatchObject({ code: 'INVALID_TIMEZONE' });
  });

  it('should reject overlapping opening hours (STO-R04)', async () => {
    await expect(
      storeService.setOpeningHours(STORE_ID, [
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
    const first = await storeService.setStoreImage(STORE_ID, EStoreImageKind.LOGO, IMAGE);
    const second = await storeService.setStoreImage(
      STORE_ID,
      EStoreImageKind.LOGO,
      IMAGE,
    );

    expect(second.logoUrl).toEqual(expect.any(String));
    expect(storageProvider.images.has(first.logoPublicId!)).toBe(false);
    expect(storageProvider.images.has(second.logoPublicId!)).toBe(true);
  });

  it('should keep the logo when the banner changes', async () => {
    await storeService.setStoreImage(STORE_ID, EStoreImageKind.LOGO, IMAGE);

    const store = await storeService.setStoreImage(
      STORE_ID,
      EStoreImageKind.BANNER,
      IMAGE,
    );

    expect(store.logoUrl).toBeDefined();
    expect(store.bannerUrl).toBeDefined();
  });
});

describe('When the scheduler refreshes the store status (STO-R05)', () => {
  it('should reset an expired forced status back to AUTO', async () => {
    await storeService.setManualStatus(STORE_ID, EManualStatus.FORCED_OPEN);
    clock.advanceSeconds(3 * 3600);

    const status = await storeService.refreshStoreStatus(STORE_ID);

    expect(status.manualStatus).toBe(EManualStatus.AUTO);
    expect(stored?.manualStatus).toBe(EManualStatus.AUTO);
    expect(stored?.manualStatusUntil).toBeUndefined();
  });
});

describe('When the owner publishes the store (TEN-R06)', () => {
  it('should publish a store with products and opening hours', async () => {
    const { store } = await storeService.setPublished(STORE_ID, true);

    expect(store.isPublished).toBe(true);
    expect(storeReadiness.countSellableProducts).toHaveBeenCalledWith(STORE_ID);
  });

  it('should list what is missing with STORE_NOT_READY', async () => {
    stored = aStore({ openingHours: [] });
    storeReadiness.countSellableProducts.mockResolvedValue(0);

    await expect(storeService.setPublished(STORE_ID, true)).rejects.toMatchObject(
      {
        code: 'STORE_NOT_READY',
        details: { missing: ['products', 'openingHours'] },
      },
    );
  });

  it('should unpublish without any check', async () => {
    stored = aStore({ isPublished: true, openingHours: [] });
    storeReadiness.countSellableProducts.mockResolvedValue(0);

    const { store } = await storeService.setPublished(STORE_ID, false);

    expect(store.isPublished).toBe(false);
  });
});
