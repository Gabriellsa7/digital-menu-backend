import { ESubjectType } from './interfaces/auth-subject.interface';
import { IRefreshSession } from './interfaces/refresh-session.interface';

export class RefreshSession implements IRefreshSession {
  public readonly id: string;
  public readonly subjectId: string;
  public readonly subjectType: ESubjectType;
  public readonly tokenHash: string;
  public readonly familyId: string;
  public readonly expiresAt: Date;
  public readonly revokedAt?: Date;
  public readonly replacedById?: string;
  public readonly userAgent?: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: IRefreshSession) {
    this.id = props.id;
    this.subjectId = props.subjectId;
    this.subjectType = props.subjectType;
    this.tokenHash = props.tokenHash;
    this.familyId = props.familyId;
    this.expiresAt = props.expiresAt;
    this.revokedAt = props.revokedAt;
    this.replacedById = props.replacedById;
    this.userAgent = props.userAgent;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isExpiredAt(date: Date): boolean {
    return this.expiresAt.getTime() <= date.getTime();
  }
}
