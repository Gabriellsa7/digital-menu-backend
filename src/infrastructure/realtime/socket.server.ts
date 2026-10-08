import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { Logger } from 'traceability';
import {
  ESubjectType,
  IAuthSubject,
} from '../../domain/auth/interfaces/auth-subject.interface';
import { ITokenService } from '../../domain/auth/interfaces/token.service.interface';
import { WS_ROOMS } from '../../interfaces/ws/ws.events';

export interface IParamsCreateSocketServer {
  httpServer: HttpServer;
  tokenService: ITokenService;
  corsOrigins: string[];
}

function roomsFor(subject?: IAuthSubject): string[] {
  if (subject?.subjectType === ESubjectType.STAFF) {
    return [WS_ROOMS.STORE_PUBLIC, WS_ROOMS.STORE_STAFF];
  }
  if (subject?.subjectType === ESubjectType.CUSTOMER) {
    return [WS_ROOMS.STORE_PUBLIC, WS_ROOMS.customer(subject.subjectId)];
  }
  return [WS_ROOMS.STORE_PUBLIC];
}

export function createSocketServer({
  httpServer,
  tokenService,
  corsOrigins,
}: IParamsCreateSocketServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.use((socket, next) => {
    const token: unknown = socket.handshake.auth?.token;
    if (!token) {
      next();
      return;
    }
    try {
      const payload = tokenService.verifyAccessToken(String(token));
      socket.data.subject = {
        subjectId: payload.sub,
        subjectType: payload.typ,
        ...(payload.role && { role: payload.role }),
        ...(payload.storeId && { storeId: payload.storeId }),
      } satisfies IAuthSubject;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const subject: IAuthSubject | undefined = socket.data.subject;
    void socket.join(roomsFor(subject));
    Logger.info('Socket connected', {
      eventName: 'ws.connected',
      subjectType: subject?.subjectType ?? 'ANONYMOUS',
    });
  });

  return io;
}
