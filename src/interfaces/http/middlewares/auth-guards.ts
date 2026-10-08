import { RequestHandler } from 'express';
import {
  ESubjectType,
  IAuthSubject,
} from '../../../domain/auth/interfaces/auth-subject.interface';
import { ITokenService } from '../../../domain/auth/interfaces/token.service.interface';
import { EStaffRole } from '../../../domain/staff-user/interfaces/staff-user.interface';
import { authenticate } from './authenticate.middleware';
import { authorize } from './authorize.middleware';

export interface IAuthGuards {
  staff: RequestHandler[];
  owner: RequestHandler[];
  customer: RequestHandler[];
}

export function staffStoreId(req: { auth?: IAuthSubject }): string {
  return req.auth!.storeId!;
}

export function createAuthGuards(tokenService: ITokenService): IAuthGuards {
  const authenticated = authenticate(tokenService);
  return {
    staff: [authenticated, authorize({ subjectType: ESubjectType.STAFF })],
    owner: [
      authenticated,
      authorize({ subjectType: ESubjectType.STAFF, roles: [EStaffRole.OWNER] }),
    ],
    customer: [authenticated, authorize({ subjectType: ESubjectType.CUSTOMER })],
  };
}
