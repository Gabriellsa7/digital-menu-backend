import mongoose from 'mongoose';
import { Logger } from 'traceability';
import {
  EFulfillmentType,
  EOrderStatus,
} from '../domain/order/interfaces/order.interface';
import { EPaymentMethod } from '../domain/payment/interfaces/payment.interface';
import { EManualStatus } from '../domain/store/interfaces/store.interface';
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
import { MstaffUser } from '../infrastructure/db/mongo/models/staff-user.model';
import { CATALOG_SEED, OPTION_GROUPS_SEED } from './seed-data/catalog';
import { couponsSeed } from './seed-data/coupons';
import { DELIVERY_CITY_SEED, DELIVERY_ZONES_SEED } from './seed-data/delivery';
import { OPENING_HOURS_SEED, STORE_SEED } from './seed-data/store';
import { DEMO_CUSTOMER_SEED, STAFF_USERS_SEED } from './seed-data/users';

const PRODUCTS_PAGE = { limit: 1000, offset: 0 };

export async function resetDatabase(): Promise<void> {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );
  Logger.warn('Database reset by the seed', { eventName: 'seed.reset' });
}

async function seedStore(): Promise<void> {
  const storeService = StoreServiceFactory.create();
  const store = await storeService.ensureDefaultStore();
  const { slug, ...settings } = STORE_SEED;
  await storeService.updateStore(store.id, {
    ...settings,
    ...(store.slug !== slug && { slug }),
  });
  await storeService.setOpeningHours(store.id, OPENING_HOURS_SEED);
}

async function seedCatalog(): Promise<void> {
  const categoryService = CategoryServiceFactory.create();
  const optionGroupService = OptionGroupServiceFactory.create();
  const productService = ProductServiceFactory.create();
  const { id: storeId } =
    await StoreServiceFactory.create().ensureDefaultStore();

  const existingGroups = await optionGroupService.listOptionGroups(storeId);
  const groupIds = new Map<string, string>();
  for (const group of OPTION_GROUPS_SEED) {
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
  for (const categorySeed of CATALOG_SEED) {
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

async function seedDeliveryZones(): Promise<void> {
  const deliveryZoneService = DeliveryZoneServiceFactory.create();
  const { id: storeId } =
    await StoreServiceFactory.create().ensureDefaultStore();
  for (const [displayName, feeInCents, etaMin, etaMax] of DELIVERY_ZONES_SEED) {
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
}

async function seedCoupons(): Promise<void> {
  const couponService = CouponServiceFactory.create();
  const { id: storeId } =
    await StoreServiceFactory.create().ensureDefaultStore();
  for (const coupon of couponsSeed(new Date())) {
    if (!(await Mcoupon.exists({ storeId, code: coupon.code }))) {
      await couponService.createCoupon({
        ...coupon,
        storeId,
        isPublic: coupon.code === 'BEMVINDO10',
      });
    }
  }
}

async function seedStaffUsers(): Promise<void> {
  const staffUserService = StaffUserServiceFactory.create();
  const store = await StoreServiceFactory.create().ensureDefaultStore();
  for (const staffUser of STAFF_USERS_SEED) {
    if (!(await MstaffUser.exists({ email: staffUser.email }))) {
      await staffUserService.createStaffUser({
        ...staffUser,
        storeId: store.id,
      });
    }
  }
}

async function seedCustomerAndOrders(): Promise<void> {
  const customerService = CustomerServiceFactory.create();
  const orderService = OrderServiceFactory.create();
  const { customer, isNew } =
    await customerService.findOrCreateCustomerByVerifiedPhone(
      DEMO_CUSTOMER_SEED.phone,
    );
  if (isNew) {
    await customerService.updateCustomerProfile({
      customerId: customer.id,
      name: DEMO_CUSTOMER_SEED.name,
    });
    await customerService.addAddress({
      customerId: customer.id,
      address: DEMO_CUSTOMER_SEED.address,
    });
  }
  const { total } = await orderService.listOrdersForCustomer(customer.id, {
    limit: 1,
    offset: 0,
  });
  if (total > 0) {
    return;
  }

  const storeService = StoreServiceFactory.create();
  const store = await storeService.ensureDefaultStore();
  const { items: products } = await ProductServiceFactory.create().listProducts(
    { storeId: store.id, search: 'Coca-Cola', ...PRODUCTS_PAGE },
  );
  const [address] = await customerService.listAddresses(customer.id);
  const cart = {
    storeId: store.id,
    customerId: customer.id,
    items: [{ productId: products[0].id, quantity: 4, options: [] }],
  };
  await storeService.setManualStatus(store.id, EManualStatus.FORCED_OPEN);
  try {
    const completed = await orderService.createOrder({
      ...cart,
      fulfillmentType: EFulfillmentType.PICKUP,
      paymentMethod: EPaymentMethod.CASH_ON_DELIVERY,
    });
    for (const status of [
      EOrderStatus.PREPARING,
      EOrderStatus.READY,
      EOrderStatus.COMPLETED,
    ]) {
      await orderService.changeOrderStatus({
        orderId: completed.id,
        staffId: 'seed',
        status,
      });
    }
    const canceled = await orderService.createOrder({
      ...cart,
      fulfillmentType: EFulfillmentType.PICKUP,
      paymentMethod: EPaymentMethod.CARD_ON_DELIVERY,
    });
    await orderService.cancelOrderByCustomer(canceled.id, customer.id);
    const preparing = await orderService.createOrder({
      ...cart,
      fulfillmentType: EFulfillmentType.DELIVERY,
      addressId: address.id,
      paymentMethod: EPaymentMethod.CASH_ON_DELIVERY,
      changeForInCents: 10000,
    });
    await orderService.changeOrderStatus({
      orderId: preparing.id,
      staffId: 'seed',
      status: EOrderStatus.PREPARING,
    });
  } finally {
    await storeService.setManualStatus(store.id, EManualStatus.AUTO);
  }
}

export async function runSeed(): Promise<void> {
  await seedStore();
  await seedCatalog();
  await seedDeliveryZones();
  await seedCoupons();
  await seedStaffUsers();
  await seedCustomerAndOrders();
  Logger.info('Seed finished', { eventName: 'seed.finished' });
}
