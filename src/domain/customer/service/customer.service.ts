import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { randomUUID } from 'crypto';
import { Logger } from 'traceability';
import { IClock } from '../../common/clock.interface';
import { normalizeBrazilianMobile } from '../../common/phone';
import { IGoogleProfile } from '../../auth/interfaces/google-identity.verifier.interface';
import { BusinessRuleError } from '../../errors/business-rule.error';
import { ConflictError } from '../../errors/conflict.error';
import { NotFoundError } from '../../errors/not-found.error';
import { Customer } from '../customer.entity';
import { IAddress, ICustomer } from '../interfaces/customer.interface';
import {
  ICustomerService,
  IFoundOrCreatedCustomer,
  IParamsAddAddress,
  IParamsCustomerService,
  IParamsUpdateAddress,
  IParamsUpdateCustomerProfile,
} from '../interfaces/customer.service.interface';
import { IDeliveryZoneResolver } from '../interfaces/delivery-zone.resolver.interface';
import { ICustomerRepositoryRead } from '../repository/customer.repository.read';
import {
  ICustomerRepositoryWrite,
  IParamsUpdateCustomerFields,
} from '../repository/customer.repository.write';

export class CustomerService implements ICustomerService {
  private customerRepositoryRead: ICustomerRepositoryRead;
  private customerRepositoryWrite: ICustomerRepositoryWrite;
  private deliveryZoneResolver: IDeliveryZoneResolver;
  private clock: IClock;

  constructor({
    customerRepositoryRead,
    customerRepositoryWrite,
    deliveryZoneResolver,
    clock,
  }: IParamsCustomerService) {
    this.customerRepositoryRead = customerRepositoryRead;
    this.customerRepositoryWrite = customerRepositoryWrite;
    this.deliveryZoneResolver = deliveryZoneResolver;
    this.clock = clock;
  }

  @ErrorHandler()
  async getCustomerById(id: string): Promise<ICustomer> {
    const customer = await this.customerRepositoryRead.findCustomerById(id);

    return customer ? customer : this.throwCustomerNotFound();
  }

  @ErrorHandler()
  async findOrCreateCustomerByVerifiedPhone(
    phone: string,
  ): Promise<IFoundOrCreatedCustomer> {
    const now = this.clock.now();
    const existing =
      await this.customerRepositoryRead.findCustomerByVerifiedPhone(phone);
    if (existing) {
      return {
        customer: await this.updateCustomer(existing.id, {
          set: { lastLoginAt: now },
        }),
        isNew: false,
      };
    }

    return {
      customer: await this.createCustomer({ phone, phoneVerifiedAt: now }),
      isNew: true,
    };
  }

  @ErrorHandler()
  async findOrCreateCustomerByGoogle(
    profile: IGoogleProfile,
  ): Promise<IFoundOrCreatedCustomer> {
    const existing = await this.customerRepositoryRead.findCustomerByGoogleSub(
      profile.sub,
    );
    if (existing) {
      return {
        customer: await this.updateCustomer(existing.id, {
          set: {
            lastLoginAt: this.clock.now(),
            ...(profile.picture && { avatarUrl: profile.picture }),
          },
        }),
        isNew: false,
      };
    }

    return {
      customer: await this.createCustomer({
        googleSub: profile.sub,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
      }),
      isNew: true,
    };
  }

  @ErrorHandler()
  async linkGoogleAccount(
    customerId: string,
    profile: IGoogleProfile,
  ): Promise<ICustomer> {
    const customer = await this.getCustomerById(customerId);
    if (customer.googleSub === profile.sub) {
      return customer;
    }
    if (customer.googleSub) {
      throw new ConflictError(
        'This account is already linked to another Google account',
        'GOOGLE_ALREADY_LINKED',
      );
    }
    const owner = await this.customerRepositoryRead.findCustomerByGoogleSub(
      profile.sub,
    );
    if (owner) {
      throw new ConflictError(
        'This Google account is already used by another customer',
        'GOOGLE_ACCOUNT_IN_USE',
      );
    }

    return this.updateCustomer(customerId, {
      set: {
        googleSub: profile.sub,
        ...(!customer.email && { email: profile.email }),
        ...(!customer.name && profile.name && { name: profile.name }),
        ...(!customer.avatarUrl &&
          profile.picture && { avatarUrl: profile.picture }),
      },
    });
  }

  @ErrorHandler()
  async updateCustomerProfile({
    customerId,
    name,
    phone,
  }: IParamsUpdateCustomerProfile): Promise<ICustomer> {
    const customer = await this.getCustomerById(customerId);
    const fields: Required<IParamsUpdateCustomerFields> = {
      set: {},
      unset: [],
    };

    if (name !== undefined) {
      fields.set.name = name.trim();
    }

    if (phone !== undefined) {
      const nextPhone =
        phone === null ? undefined : this.normalizePhoneOrThrow(phone);
      if (nextPhone !== customer.phone) {
        if (customer.phoneVerifiedAt && !customer.googleSub) {
          throw new BusinessRuleError(
            'The verified phone is the only way to log in to this account. Link a Google account before changing it',
            'PHONE_IS_ONLY_LOGIN',
          );
        }
        if (nextPhone) {
          fields.set.phone = nextPhone;
        } else {
          fields.unset.push('phone');
        }
        if (customer.phoneVerifiedAt) {
          fields.unset.push('phoneVerifiedAt');
        }
      }
    }

    if (Object.keys(fields.set).length === 0 && fields.unset.length === 0) {
      return customer;
    }
    return this.updateCustomer(customerId, fields);
  }

  @ErrorHandler()
  async listAddresses(
    customerId: string,
    storeId?: string,
  ): Promise<IAddress[]> {
    const { addresses } = await this.getCustomerById(customerId);
    return storeId
      ? Promise.all(
          addresses.map((address) => this.withDeliveryZone(storeId, address)),
        )
      : addresses;
  }

  @ErrorHandler()
  async addAddress({
    customerId,
    address,
  }: IParamsAddAddress): Promise<IAddress> {
    const customer = new Customer(await this.getCustomerById(customerId));
    const { isDefault, ...data } = address;
    const newAddress: IAddress = {
      ...data,
      id: randomUUID(),
      isDefault: Boolean(isDefault),
    };

    const updated = await this.updateCustomer(customerId, {
      set: { addresses: customer.withAddressAdded(newAddress) },
    });
    return new Customer(updated).findAddress(newAddress.id);
  }

  @ErrorHandler()
  async updateAddress({
    customerId,
    addressId,
    address,
  }: IParamsUpdateAddress): Promise<IAddress> {
    const customer = new Customer(await this.getCustomerById(customerId));
    const addresses = customer.withAddressReplaced(addressId, address);

    const updated = await this.updateCustomer(customerId, {
      set: { addresses },
    });
    return new Customer(updated).findAddress(addressId);
  }

  @ErrorHandler()
  async removeAddress(customerId: string, addressId: string): Promise<void> {
    const customer = new Customer(await this.getCustomerById(customerId));
    await this.updateCustomer(customerId, {
      set: { addresses: customer.withAddressRemoved(addressId) },
    });
  }

  @ErrorHandler()
  async setDefaultAddress(
    customerId: string,
    addressId: string,
  ): Promise<IAddress[]> {
    const customer = new Customer(await this.getCustomerById(customerId));
    const updated = await this.updateCustomer(customerId, {
      set: { addresses: customer.withDefaultAddress(addressId) },
    });
    return updated.addresses;
  }

  @ErrorHandler()
  async assertCustomerCanOrder(customerId: string): Promise<ICustomer> {
    const customer = new Customer(await this.getCustomerById(customerId));
    const missingFields = customer.missingOrderFields();
    if (missingFields.length > 0) {
      throw new BusinessRuleError(
        'Customer profile is incomplete',
        'CUSTOMER_PROFILE_INCOMPLETE',
        { missingFields },
      );
    }
    return customer;
  }

  private async createCustomer(
    data: Partial<Omit<ICustomer, 'id' | 'addresses'>>,
  ): Promise<ICustomer> {
    const now = this.clock.now();
    const customer = new Customer({
      ...data,
      id: randomUUID(),
      addresses: [],
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const created = await this.customerRepositoryWrite.createCustomer(customer);
    Logger.info('Customer created', {
      eventName: 'customer.created',
      customerId: created.id,
      method: data.googleSub ? 'google' : 'otp',
    });
    return created;
  }

  private async updateCustomer(
    id: string,
    fields: IParamsUpdateCustomerFields,
  ): Promise<ICustomer> {
    const updated = await this.customerRepositoryWrite.updateCustomerById(
      id,
      fields,
    );

    return updated ? updated : this.throwCustomerNotFound();
  }

  private throwCustomerNotFound(): never {
    throw new NotFoundError('Customer not found');
  }

  private normalizePhoneOrThrow(phone: string): string {
    const normalized = normalizeBrazilianMobile(phone);
    if (!normalized) {
      throw new BusinessRuleError(
        'Phone must be a valid Brazilian mobile number',
        'INVALID_PHONE',
      );
    }
    return normalized;
  }

  private async withDeliveryZone(
    storeId: string,
    address: IAddress,
  ): Promise<IAddress> {
    const deliveryZoneId =
      await this.deliveryZoneResolver.resolveDeliveryZoneId(
        storeId,
        address.neighborhood,
        address.city,
      );
    return { ...address, ...(deliveryZoneId && { deliveryZoneId }) };
  }
}
