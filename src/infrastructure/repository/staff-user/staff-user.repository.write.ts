import {
  IStaffUser,
  IStaffUserWithPassword,
} from '../../../domain/staff-user/interfaces/staff-user.interface';
import {
  IStaffUserRepositoryWrite,
  TStaffUserUpdatableFields,
} from '../../../domain/staff-user/repository/staff-user.repository.write';
import { MstaffUser } from '../../db/mongo/models/staff-user.model';
import { HIDE_STAFF_USER_PRIVATE_FIELDS } from '../../db/mongo/schema/staff-user.schema';

export class StaffUserRepositoryWrite implements IStaffUserRepositoryWrite {
  async createStaffUser(
    staffUser: IStaffUserWithPassword,
  ): Promise<IStaffUser> {
    const created = await MstaffUser.create(staffUser);
    const { _id, __v, passwordHash, ...createdStaffUser } = created.toObject();
    return createdStaffUser;
  }

  async updateStaffUserById(
    id: string,
    fields: TStaffUserUpdatableFields,
  ): Promise<IStaffUser | null> {
    return MstaffUser.findOneAndUpdate(
      { id },
      { $set: fields },
      { new: true, projection: HIDE_STAFF_USER_PRIVATE_FIELDS },
    ).lean<IStaffUser>();
  }

  async updateStaffUserPasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<boolean> {
    const { modifiedCount } = await MstaffUser.updateOne(
      { id },
      { $set: { passwordHash } },
    );
    return modifiedCount === 1;
  }
}
