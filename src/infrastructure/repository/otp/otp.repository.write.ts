import { IOtp } from '../../../domain/otp/interfaces/otp.interface';
import { IOtpRepositoryWrite } from '../../../domain/otp/repository/otp.repository.write';
import { Motp } from '../../db/mongo/models/otp.model';

export class OtpRepositoryWrite implements IOtpRepositoryWrite {
  /**
   * Create a new code
   * @param otp - The code to create (hash only)
   * @returns The created code
   */
  async createOtp(otp: IOtp): Promise<IOtp> {
    const created = await Motp.create(otp);
    const { _id, __v, ...createdOtp } = created.toObject();
    return createdOtp;
  }

  /**
   * Count one more wrong attempt
   * @param id - The code ID
   * @returns The attempts count after the increment
   */
  async incrementOtpAttempts(id: string): Promise<number> {
    const updated = await Motp.findOneAndUpdate(
      { id },
      { $inc: { attempts: 1 } },
      { new: true, projection: { attempts: 1 } },
    ).lean<Pick<IOtp, 'attempts'>>();
    return updated?.attempts ?? 0;
  }

  /**
   * Mark a code as used
   * @param id - The code ID
   * @param consumedAt - When it was used
   */
  async consumeOtp(id: string, consumedAt: Date): Promise<void> {
    await Motp.updateOne({ id }, { $set: { consumedAt } });
  }

  /**
   * Make every active code of the phone expire now
   * @param phone - The phone in E.164
   * @param at - The expiration date to set
   */
  async expireActiveOtps(phone: string, at: Date): Promise<void> {
    await Motp.updateMany(
      { phone, consumedAt: { $exists: false }, expiresAt: { $gt: at } },
      { $set: { expiresAt: at } },
    );
  }
}
