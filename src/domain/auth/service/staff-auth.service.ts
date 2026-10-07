import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { NotFoundError } from '../../errors/not-found.error';
import { UnauthorizedError } from '../../errors/unauthorized.error';
import { IStaffUser } from '../../staff-user/interfaces/staff-user.interface';
import { IStaffUserService } from '../../staff-user/interfaces/staff-user.service.interface';
import { ESubjectType } from '../interfaces/auth-subject.interface';
import {
  IAuthSessionService,
  IAuthTokens,
} from '../interfaces/auth-session.service.interface';
import {
  IParamsRefreshStaffSession,
  IParamsStaffAuthService,
  IParamsStaffLogin,
  IStaffAuthResult,
  IStaffAuthService,
} from '../interfaces/staff-auth.service.interface';

export class StaffAuthService implements IStaffAuthService {
  private staffUserService: IStaffUserService;
  private authSessionService: IAuthSessionService;

  constructor({ staffUserService, authSessionService }: IParamsStaffAuthService) {
    this.staffUserService = staffUserService;
    this.authSessionService = authSessionService;
  }

  @ErrorHandler()
  async login({
    email,
    password,
    userAgent,
  }: IParamsStaffLogin): Promise<IStaffAuthResult> {
    const staffUser = await this.staffUserService.verifyStaffUserCredentials({
      email,
      password,
    });
    const tokens = await this.authSessionService.startSession({
      subject: {
        subjectId: staffUser.id,
        subjectType: ESubjectType.STAFF,
        role: staffUser.role,
      },
      userAgent,
    });
    return { staffUser, tokens };
  }

  @ErrorHandler()
  async refreshSession({
    refreshToken,
    userAgent,
  }: IParamsRefreshStaffSession): Promise<IAuthTokens> {
    const rotated = await this.authSessionService.rotateSession({
      refreshToken,
      subjectType: ESubjectType.STAFF,
      userAgent,
    });
    const staffUser = await this.getActiveStaffUser(rotated.subjectId);

    const { accessToken, expiresInSeconds } =
      this.authSessionService.createAccessToken({
        subjectId: staffUser.id,
        subjectType: ESubjectType.STAFF,
        role: staffUser.role,
      });
    return {
      accessToken,
      accessTokenExpiresInSeconds: expiresInSeconds,
      refreshToken: rotated.refreshToken,
      refreshTokenExpiresAt: rotated.refreshTokenExpiresAt,
    };
  }

  @ErrorHandler()
  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.authSessionService.revokeSession(refreshToken);
    }
  }

  private async getActiveStaffUser(staffUserId: string): Promise<IStaffUser> {
    const staffUser = await this.staffUserService
      .getStaffUserById(staffUserId)
      .catch((error) => {
        if (error instanceof NotFoundError) {
          throw new UnauthorizedError('Invalid session', 'SESSION_INVALID');
        }
        throw error;
      });
    if (!staffUser.isActive) {
      await this.authSessionService.revokeAllSessionsForSubject(
        staffUser.id,
        ESubjectType.STAFF,
      );
      throw new UnauthorizedError('User is inactive', 'USER_INACTIVE');
    }
    return staffUser;
  }
}
