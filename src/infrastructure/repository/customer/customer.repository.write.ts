import { UpdateQuery } from 'mongoose';
import { ICustomer } from '../../../domain/customer/interfaces/customer.interface';
import {
  ICustomerRepositoryWrite,
  IParamsUpdateCustomerFields,
} from '../../../domain/customer/repository/customer.repository.write';
import { Mcustomer } from '../../db/mongo/models/customer.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';
import { IMCustomer } from '../../db/mongo/schema/customer.schema';

export class CustomerRepositoryWrite implements ICustomerRepositoryWrite {
  async createCustomer(customer: ICustomer): Promise<ICustomer> {
    const created = await Mcustomer.create(customer);
    const { _id, __v, ...createdCustomer } = created.toObject();
    return createdCustomer;
  }

  async updateCustomerById(
    id: string,
    { set = {}, unset = [] }: IParamsUpdateCustomerFields,
  ): Promise<ICustomer | null> {
    const update: UpdateQuery<IMCustomer> = {};
    if (Object.keys(set).length > 0) {
      update.$set = set;
    }
    if (unset.length > 0) {
      update.$unset = Object.fromEntries(unset.map((field) => [field, '']));
    }
    return Mcustomer.findOneAndUpdate({ id }, update, {
      new: true,
      projection: HIDE_MONGO_INTERNAL_FIELDS,
    }).lean<ICustomer>();
  }
}
