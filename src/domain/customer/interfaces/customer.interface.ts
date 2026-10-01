import { IPostalAddress } from '../../common/postal-address.interface';

export interface IAddress extends IPostalAddress {
  id: string;
  label: string;
  deliveryZoneId?: string;
  isDefault: boolean;
}

export interface ICustomer {
  id: string;
  name?: string;
  phone?: string;
  phoneVerifiedAt?: Date;
  email?: string;
  googleSub?: string;
  avatarUrl?: string;
  addresses: IAddress[];
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
