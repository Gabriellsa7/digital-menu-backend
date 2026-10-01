import { ICustomer } from '../../../domain/customer/interfaces/customer.interface';
import { ICustomerRepositoryRead } from '../../../domain/customer/repository/customer.repository.read';
import { Mcustomer } from '../../db/mongo/models/customer.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';

export class CustomerRepositoryRead implements ICustomerRepositoryRead {
  async findCustomerById(id: string): Promise<ICustomer | null> {
    return Mcustomer.findOne(
      { id },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<ICustomer>();
  }

  async findCustomerByVerifiedPhone(phone: string): Promise<ICustomer | null> {
    return Mcustomer.findOne(
      { phone, phoneVerifiedAt: { $exists: true } },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<ICustomer>();
  }

  async findCustomerByGoogleSub(googleSub: string): Promise<ICustomer | null> {
    return Mcustomer.findOne(
      { googleSub },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<ICustomer>();
  }
}
