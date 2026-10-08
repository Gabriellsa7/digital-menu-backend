import { IStaffUser } from '../../staff-user/interfaces/staff-user.interface';
import { IStaffUserService } from '../../staff-user/interfaces/staff-user.service.interface';
import {
  IAuthSessionService,
  IAuthTokens,
} from './auth-session.service.interface';

export interface IStaffAuthResult {
  staffUser: IStaffUser;
  tokens: IAuthTokens;
}

export interface IParamsStaffLogin {
  email: string;
  password: string;
  userAgent?: string;
}

export interface IParamsRefreshStaffSession {
  refreshToken: string;
  userAgent?: string;
}

export interface IParamsStaffAuthService {
  staffUserService: IStaffUserService;
  authSessionService: IAuthSessionService;
}

export interface IStaffAuthService {
  login(params: IParamsStaffLogin): Promise<IStaffAuthResult>;
  refreshSession(params: IParamsRefreshStaffSession): Promise<IAuthTokens>;
  logout(refreshToken?: string): Promise<void>;
}
