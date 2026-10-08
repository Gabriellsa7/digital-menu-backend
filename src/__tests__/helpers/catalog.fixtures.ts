import { ICategory } from '../../domain/category/interfaces/category.interface';
import {
  ECouponType,
  ICoupon,
} from '../../domain/coupon/interfaces/coupon.interface';
import { ICustomer } from '../../domain/customer/interfaces/customer.interface';
import { IDeliveryZone } from '../../domain/delivery-zone/interfaces/delivery-zone.interface';
import { IOptionGroup } from '../../domain/option-group/interfaces/option-group.interface';
import { IProduct } from '../../domain/product/interfaces/product.interface';
import { EWeekday, IStore } from '../../domain/store/interfaces/store.interface';
import { Store } from '../../domain/store/store.entity';

const NOW = new Date('2026-10-01T12:00:00Z');

export function aStoreFixture(overrides: Partial<IStore> = {}): IStore {
  return {
    ...Store.withDefaults('store-1', NOW, {
      name: 'Digital Menu',
      slug: 'digital-menu',
    }),
    deliveryEnabled: true,
    openingHours: [
      { weekday: EWeekday.THURSDAY, opensAt: '00:00', closesAt: '23:59' },
    ],
    minimumOrderInCents: 2000,
    ...overrides,
  };
}

export function aCategoryFixture(overrides: Partial<ICategory> = {}): ICategory {
  return {
    id: 'burgers',
    storeId: 'store-1',
    name: 'Burgers',
    position: 0,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function anOptionGroupFixture(
  overrides: Partial<IOptionGroup> = {},
): IOptionGroup {
  return {
    id: 'extras',
    storeId: 'store-1',
    name: 'Adicionais',
    minSelections: 0,
    maxSelections: 3,
    allowRepeat: true,
    options: [
      { id: 'bacon', name: 'Bacon', priceInCents: 400, isAvailable: true },
      { id: 'egg', name: 'Ovo', priceInCents: 200, isAvailable: false },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function aBreadGroupFixture(): IOptionGroup {
  return anOptionGroupFixture({
    id: 'bread',
    name: 'Pão',
    minSelections: 1,
    maxSelections: 1,
    allowRepeat: false,
    options: [
      { id: 'brioche', name: 'Brioche', priceInCents: 0, isAvailable: true },
      { id: 'potato', name: 'Batata', priceInCents: 100, isAvailable: true },
    ],
  });
}

export function aProductFixture(overrides: Partial<IProduct> = {}): IProduct {
  return {
    id: 'smash',
    storeId: 'store-1',
    categoryId: 'burgers',
    name: 'Smash',
    description: '',
    priceInCents: 3000,
    optionGroupIds: ['bread', 'extras'],
    isAvailable: true,
    isActive: true,
    position: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function aDeliveryZoneFixture(
  overrides: Partial<IDeliveryZone> = {},
): IDeliveryZone {
  return {
    id: 'zone-1',
    storeId: 'store-1',
    neighborhood: 'vila mariana',
    displayName: 'Vila Mariana',
    city: 'São Paulo',
    cityKey: 'sao paulo',
    feeInCents: 790,
    etaMinMinutes: 30,
    etaMaxMinutes: 45,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function aCustomerFixture(overrides: Partial<ICustomer> = {}): ICustomer {
  return {
    id: 'customer-1',
    name: 'Nami',
    phone: '+5511999998888',
    addresses: [
      {
        id: 'home',
        label: 'Casa',
        zipCode: '04101300',
        street: 'Rua Vergueiro',
        number: '1000',
        neighborhood: 'Vila Mariana',
        city: 'São Paulo',
        state: 'SP',
        deliveryZoneId: 'zone-1',
        isDefault: true,
      },
    ],
    lastLoginAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function aCouponFixture(overrides: Partial<ICoupon> = {}): ICoupon {
  return {
    id: 'coupon-1',
    storeId: 'store-1',
    code: 'FRETEGRATIS',
    type: ECouponType.FREE_DELIVERY,
    value: 0,
    minOrderInCents: 0,
    startsAt: new Date('2026-01-01T00:00:00Z'),
    expiresAt: new Date('2027-01-01T00:00:00Z'),
    usagePerCustomer: 1,
    usedCount: 0,
    firstOrderOnly: false,
    isActive: true,
    isPublic: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}
