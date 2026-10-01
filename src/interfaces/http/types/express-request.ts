import { IAuthSubject } from '../../../domain/auth/interfaces/auth-subject.interface';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: IAuthSubject;
    }
  }
}

export {};
