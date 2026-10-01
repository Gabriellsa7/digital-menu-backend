import { BusinessRuleError } from '../errors/business-rule.error';
import { NotFoundError } from '../errors/not-found.error';
import { IAddress, ICustomer } from './interfaces/customer.interface';

export const MAX_ADDRESSES_PER_CUSTOMER = 5;

/**
 * Address rules live here (CUS-R02): every method returns a new address list
 * and never mutates the entity, so the service decides what to persist.
 */
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

  /**
   * @throws NotFoundError when the address does not belong to the customer
   */
  findAddress(addressId: string): IAddress {
    const address = this.addresses.find(({ id }) => id === addressId);
    if (!address) {
      throw new NotFoundError('Address not found');
    }
    return address;
  }

  /**
   * The first address is always the default; a new default unsets the others.
   * @throws BusinessRuleError ADDRESS_LIMIT_REACHED when the limit is reached
   */
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

  /** Keeps the id and the default flag of the replaced address */
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

  /** Removing the default address promotes the first remaining one */
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

  /** Fields required before placing an order (CUS-R04) */
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
