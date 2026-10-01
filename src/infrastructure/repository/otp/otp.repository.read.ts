import { IOtp } from '../../../domain/otp/interfaces/otp.interface';
import { IOtpRepositoryRead } from '../../../domain/otp/repository/otp.repository.read';
import { Motp } from '../../db/mongo/models/otp.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';

export class OtpRepositoryRead implements IOtpRepositoryRead {
  async findLatestOtpByPhone(phone: string): Promise<IOtp | null> {
    return Motp.findOne({ phone }, HIDE_MONGO_INTERNAL_FIELDS)
      .sort({ createdAt: -1 })
      .lean<IOtp>();
  }

  async findActiveOtpByPhone(phone: string, now: Date): Promise<IOtp | null> {
    return Motp.findOne(
      { phone, consumedAt: { $exists: false }, expiresAt: { $gt: now } },
      HIDE_MONGO_INTERNAL_FIELDS,
    )
      .sort({ createdAt: -1 })
      .lean<IOtp>();
  }

  async listOtpCreationDatesSince(phone: string, since: Date): Promise<Date[]> {
    const otps = await Motp.find(
      { phone, createdAt: { $gte: since } },
      { createdAt: 1, _id: 0 },
    ).lean<Pick<IOtp, 'createdAt'>[]>();
    return otps.map(({ createdAt }) => createdAt);
  }
}
