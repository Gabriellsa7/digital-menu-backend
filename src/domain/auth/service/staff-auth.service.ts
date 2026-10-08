import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { NotFoundError } from '../../errors/not-found.error';
import { UnauthorizedError } from '../../errors/unauthorized.error';
import { EStaffRole, IStaffUser } from '../../staff-user/interfaces/staff-user.interface';
import { IStaffUserService } from '../../staff-user/interfaces/staff-user.service.interface';
import { IStoreService } from '../../store/interfaces/store.service.interface';
import { ESubjectType } from '../interfaces/auth-subject.interface';
import {
  IAuthSessionService,
  IAuthTokens,
} from '../interfaces/auth-session.service.interface';
import {
  IParamsRefreshStaffSession,
  IParamsStaffAuthService,
  IParamsStaffLogin,
  IParamsStaffSignup,
  IStaffAuthResult,
  IStaffAuthService,
} from '../interfaces/staff-auth.service.interface';

export class StaffAuthService implements IStaffAuthService {
  private staffUserService: IStaffUserService;
  private storeService: IStoreService;
  private authSessionService: IAuthSessionService;

  constructor({
    staffUserService,
    storeService,
    authSessionService,
  }: IParamsStaffAuthService) {
    this.staffUserService = staffUserService;
    this.storeService = storeService;
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
    return this.startSession(staffUser, userAgent);
  }

  @ErrorHandler()
  async signup({
    storeName,
    ownerName,
    email,
    password,
    userAgent,
  }: IParamsStaffSignup): Promise<IStaffAuthResult> {
    const store = await this.storeService.createStore({ name: storeName });
    const owner = await this.staffUserService
      .createStaffUser({
        storeId: store.id,
        name: ownerName,
        email,
        password,
        role: EStaffRole.OWNER,
      })
      .catch(async (error) => {
        await this.storeService.deleteStore(store.id);
        throw error;
      });
    return this.startSession(owner, userAgent);
  }

  private async startSession(
    staffUser: IStaffUser,
    userAgent?: string,
  ): Promise<IStaffAuthResult> {
    const tokens = await this.authSessionService.startSession({
      subject: {
        subjectId: staffUser.id,
        subjectType: ESubjectType.STAFF,
        role: staffUser.role,
        storeId: staffUser.storeId,
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
        storeId: staffUser.storeId,
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
