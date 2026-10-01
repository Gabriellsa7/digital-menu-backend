import { IOtp } from '../../../domain/otp/interfaces/otp.interface';
import { IOtpRepositoryWrite } from '../../../domain/otp/repository/otp.repository.write';
import { Motp } from '../../db/mongo/models/otp.model';

export class OtpRepositoryWrite implements IOtpRepositoryWrite {
  async createOtp(otp: IOtp): Promise<IOtp> {
    const created = await Motp.create(otp);
    const { _id, __v, ...createdOtp } = created.toObject();
    return createdOtp;
  }

  async incrementOtpAttempts(id: string): Promise<number> {
    const updated = await Motp.findOneAndUpdate(
      { id },
      { $inc: { attempts: 1 } },
      { new: true, projection: { attempts: 1 } },
    ).lean<Pick<IOtp, 'attempts'>>();
    return updated?.attempts ?? 0;
  }

  async consumeOtp(id: string, consumedAt: Date): Promise<void> {
    await Motp.updateOne({ id }, { $set: { consumedAt } });
  }

  async expireActiveOtps(phone: string, at: Date): Promise<void> {
    await Motp.updateMany(
      { phone, consumedAt: { $exists: false }, expiresAt: { $gt: at } },
      { $set: { expiresAt: at } },
    );
  }
}
