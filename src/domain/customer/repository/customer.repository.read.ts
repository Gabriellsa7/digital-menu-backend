import { ICustomer } from '../interfaces/customer.interface';

export interface ICustomerRepositoryRead {
  findCustomerById(id: string): Promise<ICustomer | null>;
  /** Only matches phones verified by OTP, never contact phones (CUS-R05) */
  findCustomerByVerifiedPhone(phone: string): Promise<ICustomer | null>;
  findCustomerByGoogleSub(googleSub: string): Promise<ICustomer | null>;
}
