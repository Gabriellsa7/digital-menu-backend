import {
  Customer,
  MAX_ADDRESSES_PER_CUSTOMER,
} from '../../domain/customer/customer.entity';
import { IAddress } from '../../domain/customer/interfaces/customer.interface';
import { BusinessRuleError } from '../../domain/errors/business-rule.error';
import { NotFoundError } from '../../domain/errors/not-found.error';

const NOW = new Date('2026-10-01T12:00:00.000Z');

function anAddress(id: string, isDefault = false): IAddress {
  return {
    id,
    label: id,
    zipCode: '04101300',
    street: 'Rua Vergueiro',
    number: '1000',
    neighborhood: 'Vila Mariana',
    city: 'São Paulo',
    state: 'SP',
    isDefault,
  };
}

function aCustomer(addresses: IAddress[] = []): Customer {
  return new Customer({
    id: 'customer-1',
    addresses,
    lastLoginAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

describe('When we add an address to a customer', () => {
  it('should make the first address the default one', () => {
    const addresses = aCustomer().withAddressAdded(anAddress('home'));

    expect(addresses).toEqual([anAddress('home', true)]);
  });

  it('should keep the current default when the new address is not default', () => {
    const addresses = aCustomer([anAddress('home', true)]).withAddressAdded(
      anAddress('work'),
    );

    expect(addresses.map(({ isDefault }) => isDefault)).toEqual([true, false]);
  });

  it('should unset the other defaults when the new address is default', () => {
    const addresses = aCustomer([anAddress('home', true)]).withAddressAdded(
      anAddress('work', true),
    );

    expect(addresses.map(({ isDefault }) => isDefault)).toEqual([false, true]);
  });

  it('should throw ADDRESS_LIMIT_REACHED when the limit is reached', () => {
    const full = Array.from({ length: MAX_ADDRESSES_PER_CUSTOMER }, (_, i) =>
      anAddress(`address-${i}`, i === 0),
    );

    expect(() => aCustomer(full).withAddressAdded(anAddress('extra'))).toThrow(
      BusinessRuleError,
    );
  });
});

describe('When we change the addresses of a customer', () => {
  it('should replace an address keeping its id and default flag', () => {
    const customer = aCustomer([anAddress('home', true)]);

    const [replaced] = customer.withAddressReplaced('home', {
      ...anAddress('ignored'),
      number: '2000',
    });

    expect(replaced).toMatchObject({
      id: 'home',
      number: '2000',
      isDefault: true,
    });
  });

  it('should promote the first remaining address when the default is removed', () => {
    const customer = aCustomer([anAddress('home', true), anAddress('work')]);

    expect(customer.withAddressRemoved('home')).toEqual([
      anAddress('work', true),
    ]);
  });

  it('should keep the default when a non-default address is removed', () => {
    const customer = aCustomer([anAddress('home', true), anAddress('work')]);

    expect(customer.withAddressRemoved('work')).toEqual([
      anAddress('home', true),
    ]);
  });

  it('should return an empty list when the last address is removed', () => {
    expect(
      aCustomer([anAddress('home', true)]).withAddressRemoved('home'),
    ).toEqual([]);
  });

  it('should move the default flag to the chosen address', () => {
    const customer = aCustomer([anAddress('home', true), anAddress('work')]);

    expect(
      customer.withDefaultAddress('work').map(({ isDefault }) => isDefault),
    ).toEqual([false, true]);
  });

  it('should throw NotFoundError for an unknown address', () => {
    expect(() => aCustomer().withDefaultAddress('missing')).toThrow(
      NotFoundError,
    );
  });
});

describe('When we check if a customer can order', () => {
  it('should list the missing name and phone', () => {
    expect(aCustomer().missingOrderFields()).toEqual(['name', 'phone']);
  });

  it('should return nothing when name and phone exist', () => {
    const customer = new Customer({
      ...aCustomer(),
      name: 'Nami',
      phone: '+5511999998888',
    });

    expect(customer.missingOrderFields()).toEqual([]);
  });
});
