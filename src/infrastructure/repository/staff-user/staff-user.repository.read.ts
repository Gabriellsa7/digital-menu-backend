import {
  EStaffRole,
  IStaffUser,
  IStaffUserWithPassword,
} from '../../../domain/staff-user/interfaces/staff-user.interface';
import { IStaffUserRepositoryRead } from '../../../domain/staff-user/repository/staff-user.repository.read';
import { MstaffUser } from '../../db/mongo/models/staff-user.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';
import { HIDE_STAFF_USER_PRIVATE_FIELDS } from '../../db/mongo/schema/staff-user.schema';

export class StaffUserRepositoryRead implements IStaffUserRepositoryRead {
  async findStaffUserById(id: string): Promise<IStaffUser | null> {
    return MstaffUser.findOne({ id }, HIDE_STAFF_USER_PRIVATE_FIELDS).lean<IStaffUser>();
  }

  async findStaffUserByIdWithPassword(
    id: string,
  ): Promise<IStaffUserWithPassword | null> {
    return MstaffUser.findOne(
      { id },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<IStaffUserWithPassword>();
  }

  async findStaffUserByEmail(email: string): Promise<IStaffUser | null> {
    return MstaffUser.findOne({ email }, HIDE_STAFF_USER_PRIVATE_FIELDS).lean<IStaffUser>();
  }

  async findStaffUserByEmailWithPassword(
    email: string,
  ): Promise<IStaffUserWithPassword | null> {
    return MstaffUser.findOne(
      { email },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<IStaffUserWithPassword>();
  }

  async listStaffUsers(storeId: string): Promise<IStaffUser[]> {
    return MstaffUser.find({ storeId }, HIDE_STAFF_USER_PRIVATE_FIELDS)
      .sort({ name: 1 })
      .lean<IStaffUser[]>();
  }

  async countActiveOwners(storeId: string): Promise<number> {
    return MstaffUser.countDocuments({
      storeId,
      role: EStaffRole.OWNER,
      isActive: true,
    });
  }
}
