import { ICustomer } from '../interfaces/customer.interface';

export interface ICustomerRepositoryRead {
  findCustomerById(id: string): Promise<ICustomer | null>;
  findCustomerByVerifiedPhone(phone: string): Promise<ICustomer | null>;
  findCustomerByGoogleSub(googleSub: string): Promise<ICustomer | null>;
}
