import {
  IAddress,
  ICustomer,
} from '../../../domain/customer/interfaces/customer.interface';

export interface IAddressResponse {
  id: string;
  label: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  reference?: string;
  deliveryZoneId?: string;
  isDefault: boolean;
}

export interface ICustomerResponse {
  id: string;
  name?: string;
  phone?: string;
  isPhoneVerified: boolean;
  email?: string;
  avatarUrl?: string;
  isGoogleLinked: boolean;
  addresses: IAddressResponse[];
  createdAt: Date;
}

export function toAddressResponse(address: IAddress): IAddressResponse {
  return {
    id: address.id,
    label: address.label,
    zipCode: address.zipCode,
    street: address.street,
    number: address.number,
    ...(address.complement && { complement: address.complement }),
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    ...(address.reference && { reference: address.reference }),
    ...(address.deliveryZoneId && { deliveryZoneId: address.deliveryZoneId }),
    isDefault: address.isDefault,
  };
}

export function toCustomerResponse(customer: ICustomer): ICustomerResponse {
  return {
    id: customer.id,
    ...(customer.name && { name: customer.name }),
    ...(customer.phone && { phone: customer.phone }),
    isPhoneVerified: Boolean(customer.phoneVerifiedAt),
    ...(customer.email && { email: customer.email }),
    ...(customer.avatarUrl && { avatarUrl: customer.avatarUrl }),
    isGoogleLinked: Boolean(customer.googleSub),
    addresses: customer.addresses.map(toAddressResponse),
    createdAt: customer.createdAt,
  };
}
