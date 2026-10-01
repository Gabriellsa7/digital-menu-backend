import { CustomerService } from '../../domain/customer/service/customer.service';
import { ICustomerRepositoryRead } from '../../domain/customer/repository/customer.repository.read';
import { ICustomerRepositoryWrite } from '../../domain/customer/repository/customer.repository.write';
import { IDeliveryZoneResolver } from '../../domain/customer/interfaces/delivery-zone.resolver.interface';
import {
  IAddress,
  ICustomer,
} from '../../domain/customer/interfaces/customer.interface';
import { BusinessRuleError } from '../../domain/errors/business-rule.error';
import { ConflictError } from '../../domain/errors/conflict.error';
import { NotFoundError } from '../../domain/errors/not-found.error';
import { FixedClock } from '../helpers/fixed.clock';

const clock = new FixedClock();
const PHONE = '+5511999998888';
const GOOGLE_PROFILE = {
  sub: 'google-sub-1',
  email: 'nami@gmail.com',
  name: 'Nami',
  picture: 'https://example.com/nami.png',
};
const ADDRESS_DATA = {
  label: 'Casa',
  zipCode: '04101300',
  street: 'Rua Vergueiro',
  number: '1000',
  neighborhood: 'Vila Mariana',
  city: 'São Paulo',
  state: 'SP',
};

function aCustomer(overrides: Partial<ICustomer> = {}): ICustomer {
  return {
    id: 'customer-1',
    addresses: [],
    lastLoginAt: clock.now(),
    createdAt: clock.now(),
    updatedAt: clock.now(),
    ...overrides,
  };
}

let customerRepositoryRead: jest.Mocked<ICustomerRepositoryRead>;
let customerRepositoryWrite: jest.Mocked<ICustomerRepositoryWrite>;
let deliveryZoneResolver: jest.Mocked<IDeliveryZoneResolver>;
let customerService: CustomerService;

beforeEach(() => {
  customerRepositoryRead = {
    findCustomerById: jest.fn(),
    findCustomerByVerifiedPhone: jest.fn(),
    findCustomerByGoogleSub: jest.fn(),
  };
  customerRepositoryWrite = {
    createCustomer: jest.fn(async (customer) => customer),
    updateCustomerById: jest.fn(),
  };
  deliveryZoneResolver = { resolveDeliveryZoneId: jest.fn() };
  customerService = new CustomerService({
    customerRepositoryRead,
    customerRepositoryWrite,
    deliveryZoneResolver,
    clock,
  });
});

/** Makes the write repository apply `$set` on top of the given customer */
function applyUpdatesTo(customer: ICustomer) {
  customerRepositoryWrite.updateCustomerById.mockImplementation(
    async (_id, { set = {} }) => ({ ...customer, ...set }),
  );
}

describe('When we get a customer by ID', () => {
  it('should throw NotFoundError when the customer does not exist', async () => {
    customerRepositoryRead.findCustomerById.mockResolvedValue(null);

    await expect(customerService.getCustomerById('missing')).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('When a customer logs in with a verified phone', () => {
  it('should create the customer with the verified phone on the first login', async () => {
    customerRepositoryRead.findCustomerByVerifiedPhone.mockResolvedValue(null);

    const { customer, isNew } =
      await customerService.findOrCreateCustomerByVerifiedPhone(PHONE);

    expect(isNew).toBe(true);
    expect(customer).toMatchObject({
      phone: PHONE,
      phoneVerifiedAt: clock.now(),
      addresses: [],
    });
  });

  it('should update lastLoginAt of an existing customer', async () => {
    const existing = aCustomer({ phone: PHONE, phoneVerifiedAt: clock.now() });
    customerRepositoryRead.findCustomerByVerifiedPhone.mockResolvedValue(
      existing,
    );
    applyUpdatesTo(existing);

    const { customer, isNew } =
      await customerService.findOrCreateCustomerByVerifiedPhone(PHONE);

    expect(isNew).toBe(false);
    expect(customer.id).toBe(existing.id);
    expect(customerRepositoryWrite.createCustomer).not.toHaveBeenCalled();
  });
});

describe('When a customer logs in with Google', () => {
  it('should create the customer from the Google profile', async () => {
    customerRepositoryRead.findCustomerByGoogleSub.mockResolvedValue(null);

    const { customer, isNew } =
      await customerService.findOrCreateCustomerByGoogle(GOOGLE_PROFILE);

    expect(isNew).toBe(true);
    expect(customer).toMatchObject({
      googleSub: GOOGLE_PROFILE.sub,
      email: GOOGLE_PROFILE.email,
      name: GOOGLE_PROFILE.name,
      avatarUrl: GOOGLE_PROFILE.picture,
    });
  });

  it('should return the existing customer', async () => {
    const existing = aCustomer({ googleSub: GOOGLE_PROFILE.sub });
    customerRepositoryRead.findCustomerByGoogleSub.mockResolvedValue(existing);
    applyUpdatesTo(existing);

    const { isNew } =
      await customerService.findOrCreateCustomerByGoogle(GOOGLE_PROFILE);

    expect(isNew).toBe(false);
  });
});

describe('When a customer links a Google account', () => {
  it('should link it and fill the empty profile fields', async () => {
    const existing = aCustomer({ phone: PHONE, phoneVerifiedAt: clock.now() });
    customerRepositoryRead.findCustomerById.mockResolvedValue(existing);
    customerRepositoryRead.findCustomerByGoogleSub.mockResolvedValue(null);
    applyUpdatesTo(existing);

    const customer = await customerService.linkGoogleAccount(
      existing.id,
      GOOGLE_PROFILE,
    );

    expect(customer).toMatchObject({
      googleSub: GOOGLE_PROFILE.sub,
      email: GOOGLE_PROFILE.email,
      name: GOOGLE_PROFILE.name,
    });
  });

  it('should do nothing when the same Google account is already linked', async () => {
    const existing = aCustomer({ googleSub: GOOGLE_PROFILE.sub });
    customerRepositoryRead.findCustomerById.mockResolvedValue(existing);

    await customerService.linkGoogleAccount(existing.id, GOOGLE_PROFILE);

    expect(customerRepositoryWrite.updateCustomerById).not.toHaveBeenCalled();
  });

  it('should throw GOOGLE_ALREADY_LINKED when another Google account is linked', async () => {
    customerRepositoryRead.findCustomerById.mockResolvedValue(
      aCustomer({ googleSub: 'another-sub' }),
    );

    await expect(
      customerService.linkGoogleAccount('customer-1', GOOGLE_PROFILE),
    ).rejects.toMatchObject({ code: 'GOOGLE_ALREADY_LINKED' });
  });

  it('should throw ConflictError when the Google account belongs to another customer', async () => {
    customerRepositoryRead.findCustomerById.mockResolvedValue(aCustomer());
    customerRepositoryRead.findCustomerByGoogleSub.mockResolvedValue(
      aCustomer({ id: 'someone-else' }),
    );

    await expect(
      customerService.linkGoogleAccount('customer-1', GOOGLE_PROFILE),
    ).rejects.toThrow(ConflictError);
  });
});

describe('When a customer updates their profile', () => {
  it('should trim and save the name', async () => {
    const existing = aCustomer();
    customerRepositoryRead.findCustomerById.mockResolvedValue(existing);
    applyUpdatesTo(existing);

    await customerService.updateCustomerProfile({
      customerId: existing.id,
      name: '  Nami  ',
    });

    expect(customerRepositoryWrite.updateCustomerById).toHaveBeenCalledWith(
      existing.id,
      { set: { name: 'Nami' }, unset: [] },
    );
  });

  it('should normalize a contact phone without verifying it (CUS-R05)', async () => {
    const existing = aCustomer({ googleSub: GOOGLE_PROFILE.sub });
    customerRepositoryRead.findCustomerById.mockResolvedValue(existing);
    applyUpdatesTo(existing);

    await customerService.updateCustomerProfile({
      customerId: existing.id,
      phone: '(11) 99999-8888',
    });

    expect(customerRepositoryWrite.updateCustomerById).toHaveBeenCalledWith(
      existing.id,
      { set: { phone: PHONE }, unset: [] },
    );
  });

  it('should remove the phone and its verification when Google is linked (CUS-R06)', async () => {
    const existing = aCustomer({
      phone: PHONE,
      phoneVerifiedAt: clock.now(),
      googleSub: GOOGLE_PROFILE.sub,
    });
    customerRepositoryRead.findCustomerById.mockResolvedValue(existing);
    applyUpdatesTo(existing);

    await customerService.updateCustomerProfile({
      customerId: existing.id,
      phone: null,
    });

    expect(customerRepositoryWrite.updateCustomerById).toHaveBeenCalledWith(
      existing.id,
      { set: {}, unset: ['phone', 'phoneVerifiedAt'] },
    );
  });

  it('should throw PHONE_IS_ONLY_LOGIN when an SMS-only account changes its phone', async () => {
    customerRepositoryRead.findCustomerById.mockResolvedValue(
      aCustomer({ phone: PHONE, phoneVerifiedAt: clock.now() }),
    );

    await expect(
      customerService.updateCustomerProfile({
        customerId: 'customer-1',
        phone: '+5511988887777',
      }),
    ).rejects.toMatchObject({ code: 'PHONE_IS_ONLY_LOGIN' });
  });

  it('should throw INVALID_PHONE for a landline', async () => {
    customerRepositoryRead.findCustomerById.mockResolvedValue(aCustomer());

    await expect(
      customerService.updateCustomerProfile({
        customerId: 'customer-1',
        phone: '(11) 3333-4444',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PHONE' });
  });

  it('should not write when nothing changes', async () => {
    const existing = aCustomer({ phone: PHONE });
    customerRepositoryRead.findCustomerById.mockResolvedValue(existing);

    const customer = await customerService.updateCustomerProfile({
      customerId: existing.id,
      phone: PHONE,
    });

    expect(customer).toBe(existing);
    expect(customerRepositoryWrite.updateCustomerById).not.toHaveBeenCalled();
  });
});

describe('When a customer manages addresses', () => {
  it('should resolve the delivery zone of a new address (CUS-R03)', async () => {
    const existing = aCustomer();
    customerRepositoryRead.findCustomerById.mockResolvedValue(existing);
    deliveryZoneResolver.resolveDeliveryZoneId.mockResolvedValue('zone-1');
    applyUpdatesTo(existing);

    const address = await customerService.addAddress({
      customerId: existing.id,
      address: ADDRESS_DATA,
    });

    expect(deliveryZoneResolver.resolveDeliveryZoneId).toHaveBeenCalledWith(
      'Vila Mariana',
      'São Paulo',
    );
    expect(address).toMatchObject({
      ...ADDRESS_DATA,
      deliveryZoneId: 'zone-1',
      isDefault: true,
    });
  });

  it('should save an unserved address without a delivery zone', async () => {
    const existing = aCustomer();
    customerRepositoryRead.findCustomerById.mockResolvedValue(existing);
    deliveryZoneResolver.resolveDeliveryZoneId.mockResolvedValue(undefined);
    applyUpdatesTo(existing);

    const address = await customerService.addAddress({
      customerId: existing.id,
      address: ADDRESS_DATA,
    });

    expect(address).not.toHaveProperty('deliveryZoneId');
  });

  it('should update, remove, list and set the default address', async () => {
    const home: IAddress = { ...ADDRESS_DATA, id: 'home', isDefault: true };
    const work: IAddress = { ...ADDRESS_DATA, id: 'work', isDefault: false };
    const existing = aCustomer({ addresses: [home, work] });
    customerRepositoryRead.findCustomerById.mockResolvedValue(existing);
    applyUpdatesTo(existing);

    const updated = await customerService.updateAddress({
      customerId: existing.id,
      addressId: 'work',
      address: { ...ADDRESS_DATA, number: '2000' },
    });
    const withDefault = await customerService.setDefaultAddress(
      existing.id,
      'work',
    );
    await customerService.removeAddress(existing.id, 'home');
    const listed = await customerService.listAddresses(existing.id);

    expect(updated).toMatchObject({ id: 'work', number: '2000' });
    expect(withDefault.find(({ id }) => id === 'work')?.isDefault).toBe(true);
    expect(listed).toEqual([home, work]);
  });

  it('should throw NotFoundError when the customer disappears during the update', async () => {
    customerRepositoryRead.findCustomerById.mockResolvedValue(aCustomer());
    customerRepositoryWrite.updateCustomerById.mockResolvedValue(null);

    await expect(
      customerService.addAddress({
        customerId: 'customer-1',
        address: ADDRESS_DATA,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('When we check if a customer can order (CUS-R04)', () => {
  it('should throw CUSTOMER_PROFILE_INCOMPLETE listing the missing fields', async () => {
    customerRepositoryRead.findCustomerById.mockResolvedValue(
      aCustomer({ name: 'Nami' }),
    );

    const error = await customerService
      .assertCustomerCanOrder('customer-1')
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(BusinessRuleError);
    expect(error).toMatchObject({
      code: 'CUSTOMER_PROFILE_INCOMPLETE',
      details: { missingFields: ['phone'] },
    });
  });

  it('should return the customer when the profile is complete', async () => {
    customerRepositoryRead.findCustomerById.mockResolvedValue(
      aCustomer({ name: 'Nami', phone: PHONE }),
    );

    await expect(
      customerService.assertCustomerCanOrder('customer-1'),
    ).resolves.toMatchObject({ name: 'Nami' });
  });
});
