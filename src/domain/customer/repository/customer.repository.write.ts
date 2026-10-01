import { ICustomer } from '../interfaces/customer.interface';

export type TOptionalCustomerField =
  | 'name'
  | 'phone'
  | 'phoneVerifiedAt'
  | 'email'
  | 'googleSub'
  | 'avatarUrl';

export interface IParamsUpdateCustomerFields {
  set?: Partial<Omit<ICustomer, 'id' | 'createdAt' | 'updatedAt'>>;
  unset?: TOptionalCustomerField[];
}

export interface ICustomerRepositoryWrite {
  createCustomer(customer: ICustomer): Promise<ICustomer>;
  updateCustomerById(
    id: string,
    fields: IParamsUpdateCustomerFields,
  ): Promise<ICustomer | null>;
}
