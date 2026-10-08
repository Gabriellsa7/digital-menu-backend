import { IClock } from '../../common/clock.interface';
import { IGoogleProfile } from '../../auth/interfaces/google-identity.verifier.interface';
import { ICustomerRepositoryRead } from '../repository/customer.repository.read';
import { ICustomerRepositoryWrite } from '../repository/customer.repository.write';
import { IAddress, ICustomer } from './customer.interface';
import { IDeliveryZoneResolver } from './delivery-zone.resolver.interface';

export type IParamsAddressData = Omit<
  IAddress,
  'id' | 'deliveryZoneId' | 'isDefault'
>;

export interface IParamsAddAddress {
  customerId: string;
  address: IParamsAddressData & { isDefault?: boolean };
}

export interface IParamsUpdateAddress {
  customerId: string;
  addressId: string;
  address: IParamsAddressData;
}

export interface IParamsUpdateCustomerProfile {
  customerId: string;
  name?: string;
  phone?: string | null;
}

export interface IFoundOrCreatedCustomer {
  customer: ICustomer;
  isNew: boolean;
}

export interface IParamsCustomerService {
  customerRepositoryRead: ICustomerRepositoryRead;
  customerRepositoryWrite: ICustomerRepositoryWrite;
  deliveryZoneResolver: IDeliveryZoneResolver;
  clock: IClock;
}

export interface ICustomerService {
  getCustomerById(id: string): Promise<ICustomer>;
  findOrCreateCustomerByVerifiedPhone(
    phone: string,
  ): Promise<IFoundOrCreatedCustomer>;
  findOrCreateCustomerByGoogle(
    profile: IGoogleProfile,
  ): Promise<IFoundOrCreatedCustomer>;
  linkGoogleAccount(
    customerId: string,
    profile: IGoogleProfile,
  ): Promise<ICustomer>;
  updateCustomerProfile(
    params: IParamsUpdateCustomerProfile,
  ): Promise<ICustomer>;
  listAddresses(customerId: string, storeId?: string): Promise<IAddress[]>;
  addAddress(params: IParamsAddAddress): Promise<IAddress>;
  updateAddress(params: IParamsUpdateAddress): Promise<IAddress>;
  removeAddress(customerId: string, addressId: string): Promise<void>;
  setDefaultAddress(customerId: string, addressId: string): Promise<IAddress[]>;
  assertCustomerCanOrder(customerId: string): Promise<ICustomer>;
}
