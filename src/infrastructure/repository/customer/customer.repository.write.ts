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
  /**
   * Create a new customer in the database
   * @param customer - The customer data to create
   * @returns The created customer
   */
  async createCustomer(customer: ICustomer): Promise<ICustomer> {
    const created = await Mcustomer.create(customer);
    const { _id, __v, ...createdCustomer } = created.toObject();
    return createdCustomer;
  }

  /**
   * Update a customer by ID, removing optional fields with $unset
   * @param id - The customer's ID
   * @param fields - Fields to set and optional fields to remove
   * @returns The updated customer or null if not found
   */
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
