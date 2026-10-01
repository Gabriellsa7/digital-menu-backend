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
  /** Optional fields to remove from the document ($unset, never null) */
  unset?: TOptionalCustomerField[];
}

export interface ICustomerRepositoryWrite {
  createCustomer(customer: ICustomer): Promise<ICustomer>;
  updateCustomerById(
    id: string,
    fields: IParamsUpdateCustomerFields,
  ): Promise<ICustomer | null>;
}
