import { IAuthSubject } from '../../../domain/auth/interfaces/auth-subject.interface';

// Adds the authenticated subject set by the `authenticate` middleware.
// Import this file (side effect) wherever `req.auth` is read.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: IAuthSubject;
    }
  }
}

export {};
