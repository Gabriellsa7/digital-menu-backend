import { randomUUID } from 'crypto';
import { EManualStatus } from '../../domain/store/interfaces/store.interface';
import { CustomerServiceFactory } from '../../infrastructure/config/factories/customer.service.factory';
import { DeliveryZoneServiceFactory } from '../../infrastructure/config/factories/delivery-zone.service.factory';
import { StoreServiceFactory } from '../../infrastructure/config/factories/store.service.factory';
import { Mcoupon } from '../../infrastructure/db/mongo/models/coupon.model';
import { MdeliveryZone } from '../../infrastructure/db/mongo/models/delivery-zone.model';
import { Morder } from '../../infrastructure/db/mongo/models/order.model';
import { Mstore } from '../../infrastructure/db/mongo/models/store.model';
import {
  clearCatalog,
  createCategory,
  createOptionGroup,
  createProduct,
} from './catalog.helper';
import { loginCustomerWithOtp } from './customer-session.helper';

export async function setupCheckout() {
  await Promise.all([
    clearCatalog(),
    Mstore.deleteMany({}),
    MdeliveryZone.deleteMany({}),
    Mcoupon.deleteMany({}),
    Morder.deleteMany({}),
  ]);
  const storeService = StoreServiceFactory.create();
  const store = await storeService.ensureDefaultStore();
  await storeService.updateStore(store.id, {
    minimumOrderInCents: 2000,
    deliveryEnabled: true,
  });
  await storeService.setManualStatus(store.id, EManualStatus.FORCED_OPEN);

  const zone = await DeliveryZoneServiceFactory.create().createDeliveryZone({
    displayName: 'Vila Mariana',
    city: 'São Paulo',
    feeInCents: 790,
    etaMinMinutes: 30,
    etaMaxMinutes: 45,
    isActive: true,
  });
  const category = await createCategory(`Burgers ${randomUUID()}`);
  const extras = await createOptionGroup();
  const smash = await createProduct(category.id, {
    priceInCents: 3000,
    optionGroupIds: [extras.id],
  });

  const session = await loginCustomerWithOtp();
  const customerService = CustomerServiceFactory.create();
  await customerService.updateCustomerProfile({
    customerId: session.customerId,
    name: 'Nami',
  });
  const address = await customerService.addAddress({
    customerId: session.customerId,
    address: {
      label: 'Casa',
      zipCode: '04101300',
      street: 'Rua Vergueiro',
      number: '1000',
      neighborhood: 'Vila Mariana',
      city: 'São Paulo',
      state: 'SP',
    },
  });

  return {
    ...session,
    storeId: store.id,
    zone,
    smash,
    extras,
    address,
    storeService,
  };
}
