import { BusinessRuleError } from '../errors/business-rule.error';
import { NotFoundError } from '../errors/not-found.error';
import { IAddress, ICustomer } from './interfaces/customer.interface';

export const MAX_ADDRESSES_PER_CUSTOMER = 5;

export class Customer implements ICustomer {
  public readonly id: string;
  public readonly name?: string;
  public readonly phone?: string;
  public readonly phoneVerifiedAt?: Date;
  public readonly email?: string;
  public readonly googleSub?: string;
  public readonly avatarUrl?: string;
  public readonly addresses: IAddress[];
  public readonly lastLoginAt: Date;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: ICustomer) {
    this.id = props.id;
    this.name = props.name;
    this.phone = props.phone;
    this.phoneVerifiedAt = props.phoneVerifiedAt;
    this.email = props.email;
    this.googleSub = props.googleSub;
    this.avatarUrl = props.avatarUrl;
    this.addresses = props.addresses;
    this.lastLoginAt = props.lastLoginAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  findAddress(addressId: string): IAddress {
    const address = this.addresses.find(({ id }) => id === addressId);
    if (!address) {
      throw new NotFoundError('Address not found');
    }
    return address;
  }

  withAddressAdded(address: IAddress): IAddress[] {
    if (this.addresses.length >= MAX_ADDRESSES_PER_CUSTOMER) {
      throw new BusinessRuleError(
        `A customer can save at most ${MAX_ADDRESSES_PER_CUSTOMER} addresses`,
        'ADDRESS_LIMIT_REACHED',
      );
    }
    const isDefault = this.addresses.length === 0 || address.isDefault;
    const others = isDefault
      ? this.addresses.map((current) => ({ ...current, isDefault: false }))
      : this.addresses;
    return [...others, { ...address, isDefault }];
  }

  withAddressReplaced(
    addressId: string,
    data: Omit<IAddress, 'id' | 'isDefault'>,
  ): IAddress[] {
    const current = this.findAddress(addressId);
    return this.addresses.map((address) =>
      address.id === addressId
        ? { ...data, id: current.id, isDefault: current.isDefault }
        : address,
    );
  }

  withAddressRemoved(addressId: string): IAddress[] {
    const removed = this.findAddress(addressId);
    const remaining = this.addresses.filter(({ id }) => id !== addressId);
    if (!removed.isDefault || remaining.length === 0) {
      return remaining;
    }
    return remaining.map((address, index) => ({
      ...address,
      isDefault: index === 0,
    }));
  }

  withDefaultAddress(addressId: string): IAddress[] {
    this.findAddress(addressId);
    return this.addresses.map((address) => ({
      ...address,
      isDefault: address.id === addressId,
    }));
  }

  missingOrderFields(): string[] {
    const missing: string[] = [];
    if (!this.name) {
      missing.push('name');
    }
    if (!this.phone) {
      missing.push('phone');
    }
    return missing;
  }
}
