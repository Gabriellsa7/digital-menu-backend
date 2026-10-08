import mongoose from 'mongoose';
import { Logger } from 'traceability';
import { IParamsCouponData } from '../domain/coupon/interfaces/coupon.service.interface';
import { ICartItem } from '../domain/order/interfaces/order-pricing.service.interface';
import {
  EFulfillmentType,
  EOrderStatus,
} from '../domain/order/interfaces/order.interface';
import { EPaymentMethod } from '../domain/payment/interfaces/payment.interface';
import { IParamsCreateStaffUser } from '../domain/staff-user/interfaces/staff-user.service.interface';
import {
  EManualStatus,
  IOpeningHour,
  IStore,
} from '../domain/store/interfaces/store.interface';
import { IParamsCreateStore } from '../domain/store/interfaces/store.service.interface';
import { CategoryServiceFactory } from '../infrastructure/config/factories/category.service.factory';
import { CouponServiceFactory } from '../infrastructure/config/factories/coupon.service.factory';
import { CustomerServiceFactory } from '../infrastructure/config/factories/customer.service.factory';
import { DeliveryZoneServiceFactory } from '../infrastructure/config/factories/delivery-zone.service.factory';
import { OptionGroupServiceFactory } from '../infrastructure/config/factories/option-group.service.factory';
import { OrderServiceFactory } from '../infrastructure/config/factories/order.service.factory';
import { ProductServiceFactory } from '../infrastructure/config/factories/product.service.factory';
import { StaffUserServiceFactory } from '../infrastructure/config/factories/staff-user.service.factory';
import { StoreServiceFactory } from '../infrastructure/config/factories/store.service.factory';
import { Mcoupon } from '../infrastructure/db/mongo/models/coupon.model';
import { Mstore } from '../infrastructure/db/mongo/models/store.model';
import { MstaffUser } from '../infrastructure/db/mongo/models/staff-user.model';
import {
  CATALOG_SEED,
  ICategorySeed,
  IOptionGroupSeed,
  OPTION_GROUPS_SEED,
} from './seed-data/catalog';
import { couponsSeed } from './seed-data/coupons';
import { DELIVERY_CITY_SEED, DELIVERY_ZONES_SEED } from './seed-data/delivery';
import {
  DRAFT_STAFF_USERS_SEED,
  DRAFT_STORE_SEED,
  PIZZERIA_CATALOG_SEED,
  PIZZERIA_OPENING_HOURS_SEED,
  PIZZERIA_OPTION_GROUPS_SEED,
  PIZZERIA_STAFF_USERS_SEED,
  PIZZERIA_STORE_SEED,
  PIZZERIA_ZONES_SEED,
  pizzeriaCouponsSeed,
} from './seed-data/pizzeria';
import {
  MAJIN_MEU_CATALOG_SEED,
  MAJIN_MEU_IMAGES_SEED,
  MAJIN_MEU_OPENING_HOURS_SEED,
  MAJIN_MEU_OPTION_GROUPS_SEED,
  MAJIN_MEU_STAFF_USERS_SEED,
  MAJIN_MEU_STORE_SEED,
  MAJIN_MEU_ZONES_SEED,
  majinMeuCouponsSeed,
} from './seed-data/majin-meu';
import { OPENING_HOURS_SEED, STORE_SEED } from './seed-data/store';
import { DEMO_CUSTOMER_SEED, STAFF_USERS_SEED } from './seed-data/users';

const PRODUCTS_PAGE = { limit: 1000, offset: 0 };
const PROMOTION_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

interface IStoreSeed {
  store: IParamsCreateStore & { slug: string };
  openingHours: IOpeningHour[];
  images?: Pick<IStore, 'logoUrl' | 'bannerUrl'>;
  optionGroups: IOptionGroupSeed[];
  catalog: ICategorySeed[];
  zones: [string, number, number, number][];
  coupons: (now: Date) => Omit<IParamsCouponData, 'storeId'>[];
  staffUsers: Omit<IParamsCreateStaffUser, 'storeId'>[];
  featured?: string[];
  promotions?: [string, number][];
}

const STORES_SEED: IStoreSeed[] = [
  {
    store: { ...STORE_SEED, isPublished: true },
    openingHours: OPENING_HOURS_SEED,
    optionGroups: OPTION_GROUPS_SEED,
    catalog: CATALOG_SEED,
    zones: DELIVERY_ZONES_SEED,
    coupons: (now) =>
      couponsSeed(now).map((coupon) => ({
        ...coupon,
        isPublic: coupon.code === 'BEMVINDO10',
      })),
    staffUsers: STAFF_USERS_SEED,
    featured: ['Smash duplo', 'Combo casal', 'Milkshake de chocolate'],
    promotions: [
      ['Smash duplo', 2990],
      ['Milkshake de Ovomaltine', 1590],
    ],
  },
  {
    store: { ...PIZZERIA_STORE_SEED, isPublished: true },
    openingHours: PIZZERIA_OPENING_HOURS_SEED,
    optionGroups: PIZZERIA_OPTION_GROUPS_SEED,
    catalog: PIZZERIA_CATALOG_SEED,
    zones: PIZZERIA_ZONES_SEED,
    coupons: pizzeriaCouponsSeed,
    staffUsers: PIZZERIA_STAFF_USERS_SEED,
    featured: ['Margherita'],
  },
  {
    store: { ...MAJIN_MEU_STORE_SEED, isPublished: true },
    openingHours: MAJIN_MEU_OPENING_HOURS_SEED,
    images: MAJIN_MEU_IMAGES_SEED,
    optionGroups: MAJIN_MEU_OPTION_GROUPS_SEED,
    catalog: MAJIN_MEU_CATALOG_SEED,
    zones: MAJIN_MEU_ZONES_SEED,
    coupons: majinMeuCouponsSeed,
    staffUsers: MAJIN_MEU_STAFF_USERS_SEED,
    featured: ['Lámen tradicional', 'Gyoza'],
    promotions: [['Gyudon', 3190]],
  },
  {
    store: DRAFT_STORE_SEED,
    openingHours: [],
    optionGroups: [],
    catalog: [],
    zones: [],
    coupons: () => [],
    staffUsers: DRAFT_STAFF_USERS_SEED,
  },
];

export async function resetDatabase(): Promise<void> {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );
  Logger.warn('Database reset by the seed', { eventName: 'seed.reset' });
}

async function seedStore({
  store,
  openingHours,
  images,
}: IStoreSeed): Promise<IStore> {
  const storeService = StoreServiceFactory.create();
  const existing = await Mstore.findOne({ slug: store.slug }).lean<IStore>();
  const saved = existing ?? (await storeService.createStore(store));
  if (images) {
    await Mstore.updateOne({ slug: store.slug }, { $set: images });
  }
  return storeService.setOpeningHours(saved.id, openingHours);
}

async function seedCatalog(storeId: string, seed: IStoreSeed): Promise<void> {
  const categoryService = CategoryServiceFactory.create();
  const optionGroupService = OptionGroupServiceFactory.create();
  const productService = ProductServiceFactory.create();

  const existingGroups = await optionGroupService.listOptionGroups(storeId);
  const groupIds = new Map<string, string>();
  for (const group of seed.optionGroups) {
    const existing = existingGroups.find(({ name }) => name === group.name);
    const saved =
      existing ??
      (await optionGroupService.createOptionGroup({
        ...group,
        storeId,
        options: group.options.map(([name, priceInCents]) => ({
          name,
          priceInCents,
        })),
      }));
    groupIds.set(group.key, saved.id);
  }

  const existingCategories = await categoryService.listCategories(storeId);
  const { items: existingProducts } = await productService.listProducts({
    storeId,
    ...PRODUCTS_PAGE,
  });
  for (const categorySeed of seed.catalog) {
    const category =
      existingCategories.find(({ name }) => name === categorySeed.name) ??
      (await categoryService.createCategory({
        storeId,
        name: categorySeed.name,
      }));
    for (const product of categorySeed.products) {
      const exists = existingProducts.some(
        ({ name, categoryId }) =>
          name === product.name && categoryId === category.id,
      );
      if (!exists) {
        await productService.createProduct({
          storeId,
          categoryId: category.id,
          name: product.name,
          description: product.description,
          priceInCents: product.priceInCents,
          optionGroupIds: (product.groups ?? []).map(
            (key) => groupIds.get(key)!,
          ),
          isAvailable: product.isAvailable ?? true,
          isActive: true,
          servesPeople: product.servesPeople,
        });
      }
    }
  }
}

async function seedHighlights(
  storeId: string,
  seed: IStoreSeed,
): Promise<void> {
  const productService = ProductServiceFactory.create();
  const { items: products } = await productService.listProducts({
    storeId,
    ...PRODUCTS_PAGE,
  });
  const byName = new Map(products.map((product) => [product.name, product]));
  for (const name of seed.featured ?? []) {
    await productService.setProductFeatured({
      storeId,
      id: byName.get(name)!.id,
      isFeatured: true,
    });
  }
  const now = Date.now();
  for (const [name, priceInCents] of seed.promotions ?? []) {
    await productService.setProductPromotion({
      storeId,
      id: byName.get(name)!.id,
      promotion: {
        priceInCents,
        startsAt: new Date(now),
        endsAt: new Date(now + PROMOTION_DAYS * MILLISECONDS_PER_DAY),
      },
    });
  }
}

async function seedZonesCouponsAndStaff(
  storeId: string,
  seed: IStoreSeed,
): Promise<void> {
  const deliveryZoneService = DeliveryZoneServiceFactory.create();
  for (const [displayName, feeInCents, etaMin, etaMax] of seed.zones) {
    const existing = await deliveryZoneService.resolveDeliveryZoneId(
      storeId,
      displayName,
      DELIVERY_CITY_SEED,
    );
    if (!existing) {
      await deliveryZoneService.createDeliveryZone({
        storeId,
        displayName,
        city: DELIVERY_CITY_SEED,
        feeInCents,
        etaMinMinutes: etaMin,
        etaMaxMinutes: etaMax,
        isActive: true,
      });
    }
  }
  const couponService = CouponServiceFactory.create();
  for (const coupon of seed.coupons(new Date())) {
    if (!(await Mcoupon.exists({ storeId, code: coupon.code }))) {
      await couponService.createCoupon({ ...coupon, storeId });
    }
  }
  const staffUserService = StaffUserServiceFactory.create();
  for (const staffUser of seed.staffUsers) {
    if (!(await MstaffUser.exists({ email: staffUser.email }))) {
      await staffUserService.createStaffUser({ ...staffUser, storeId });
    }
  }
}

async function placeOrder(
  store: IStore,
  customerId: string,
  items: ICartItem[],
  status: EOrderStatus,
): Promise<void> {
  const orderService = OrderServiceFactory.create();
  const order = await orderService.createOrder({
    storeId: store.id,
    customerId,
    items,
    fulfillmentType: EFulfillmentType.PICKUP,
    paymentMethod: EPaymentMethod.CASH_ON_DELIVERY,
  });
  if (status === EOrderStatus.CANCELED) {
    await orderService.cancelOrderByCustomer(order.id, customerId);
    return;
  }
  const steps = [
    EOrderStatus.PREPARING,
    EOrderStatus.READY,
    EOrderStatus.COMPLETED,
  ];
  for (const step of steps.slice(0, steps.indexOf(status) + 1)) {
    await orderService.changeOrderStatus({
      storeId: store.id,
      orderId: order.id,
      staffId: 'seed',
      status: step,
    });
  }
}

async function seedCustomerAndOrders(stores: IStore[]): Promise<void> {
  const customerService = CustomerServiceFactory.create();
  const { customer, isNew } =
    await customerService.findOrCreateCustomerByVerifiedPhone(
      DEMO_CUSTOMER_SEED.phone,
    );
  if (!isNew) {
    return;
  }
  await customerService.updateCustomerProfile({
    customerId: customer.id,
    name: DEMO_CUSTOMER_SEED.name,
  });
  await customerService.addAddress({
    customerId: customer.id,
    address: DEMO_CUSTOMER_SEED.address,
  });
  const storeService = StoreServiceFactory.create();
  const productService = ProductServiceFactory.create();
  const orders: [string, EOrderStatus][][] = [
    [
      ['Brownie', EOrderStatus.COMPLETED],
      ['Fritas com cheddar e bacon', EOrderStatus.COMPLETED],
      ['Coca-Cola lata', EOrderStatus.COMPLETED],
      ['Coca-Cola lata', EOrderStatus.CANCELED],
      ['Cookie', EOrderStatus.PREPARING],
    ],
    [['Margherita', EOrderStatus.COMPLETED]],
  ];
  for (const [index, store] of stores.slice(0, orders.length).entries()) {
    const { items: products } = await productService.listProducts({
      storeId: store.id,
      ...PRODUCTS_PAGE,
    });
    await storeService.setManualStatus(store.id, EManualStatus.FORCED_OPEN);
    try {
      for (const [name, status] of orders[index]) {
        const product = products.find((candidate) => candidate.name === name)!;
        await placeOrder(
          store,
          customer.id,
          [{ productId: product.id, quantity: 2, options: [] }],
          status,
        );
      }
    } finally {
      await storeService.setManualStatus(store.id, EManualStatus.AUTO);
    }
  }
}

export async function runSeed(): Promise<void> {
  const stores: IStore[] = [];
  for (const seed of STORES_SEED) {
    const store = await seedStore(seed);
    await seedCatalog(store.id, seed);
    await seedHighlights(store.id, seed);
    await seedZonesCouponsAndStaff(store.id, seed);
    stores.push(store);
  }
  await seedCustomerAndOrders(stores);
  Logger.info('Seed finished', { eventName: 'seed.finished' });
}
