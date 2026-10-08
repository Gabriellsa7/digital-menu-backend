import { StaffAuthService } from '../../../domain/auth/service/staff-auth.service';
import { AuthSessionServiceFactory } from './auth-session.service.factory';
import { StaffUserServiceFactory } from './staff-user.service.factory';
import { StoreServiceFactory } from './store.service.factory';

export class StaffAuthServiceFactory {
  static create() {
    return new StaffAuthService({
      staffUserService: StaffUserServiceFactory.create(),
      storeService: StoreServiceFactory.create(),
      authSessionService: AuthSessionServiceFactory.create(),
    });
  }
}
