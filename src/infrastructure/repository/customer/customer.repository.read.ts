import { ICustomer } from '../../../domain/customer/interfaces/customer.interface';
import { ICustomerRepositoryRead } from '../../../domain/customer/repository/customer.repository.read';
import { Mcustomer } from '../../db/mongo/models/customer.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';

export class CustomerRepositoryRead implements ICustomerRepositoryRead {
  /**
   * Find a customer by ID
   * @param id - The customer's ID
   * @returns The customer or null if not found
   */
  async findCustomerById(id: string): Promise<ICustomer | null> {
    return Mcustomer.findOne(
      { id },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<ICustomer>();
  }

  /**
   * Find a customer whose phone was verified by OTP
   * @param phone - The phone in E.164
   * @returns The customer or null if not found
   */
  async findCustomerByVerifiedPhone(phone: string): Promise<ICustomer | null> {
    return Mcustomer.findOne(
      { phone, phoneVerifiedAt: { $exists: true } },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<ICustomer>();
  }

  /**
   * Find a customer by their Google account id
   * @param googleSub - The Google `sub` claim
   * @returns The customer or null if not found
   */
  async findCustomerByGoogleSub(googleSub: string): Promise<ICustomer | null> {
    return Mcustomer.findOne(
      { googleSub },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<ICustomer>();
  }
}
