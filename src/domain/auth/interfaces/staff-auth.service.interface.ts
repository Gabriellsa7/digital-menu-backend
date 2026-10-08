import { IStaffUser } from '../../staff-user/interfaces/staff-user.interface';
import { IStaffUserService } from '../../staff-user/interfaces/staff-user.service.interface';
import { IStoreService } from '../../store/interfaces/store.service.interface';
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

export interface IParamsStaffSignup {
  storeName: string;
  ownerName: string;
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
  storeService: IStoreService;
  authSessionService: IAuthSessionService;
}

export interface IStaffAuthService {
  login(params: IParamsStaffLogin): Promise<IStaffAuthResult>;
  signup(params: IParamsStaffSignup): Promise<IStaffAuthResult>;
  refreshSession(params: IParamsRefreshStaffSession): Promise<IAuthTokens>;
  logout(refreshToken?: string): Promise<void>;
}
