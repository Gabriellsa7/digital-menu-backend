import { StaffUserService } from '../../../domain/staff-user/service/staff-user.service';
import { SystemClock } from '../../common/system.clock';
import { StaffUserRepositoryRead } from '../../repository/staff-user/staff-user.repository.read';
import { StaffUserRepositoryWrite } from '../../repository/staff-user/staff-user.repository.write';
import { BcryptPasswordHasher } from '../../security/bcrypt.password-hasher';
import { env } from '../env';
import { AuthSessionServiceFactory } from './auth-session.service.factory';

export class StaffUserServiceFactory {
  static create() {
    return new StaffUserService({
      staffUserRepositoryRead: new StaffUserRepositoryRead(),
      staffUserRepositoryWrite: new StaffUserRepositoryWrite(),
      passwordHasher: new BcryptPasswordHasher(env.bcryptRounds),
      authSessionService: AuthSessionServiceFactory.create(),
      clock: new SystemClock(),
    });
  }
}
