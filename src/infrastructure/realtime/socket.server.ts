import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { Logger } from 'traceability';
import {
  ESubjectType,
  IAuthSubject,
} from '../../domain/auth/interfaces/auth-subject.interface';
import { ITokenService } from '../../domain/auth/interfaces/token.service.interface';
import { IStoreService } from '../../domain/store/interfaces/store.service.interface';
import { WS_ROOMS } from '../../interfaces/ws/ws.events';

export type TStoreIdResolver = (storeSlug: string) => Promise<string | undefined>;

export function publishedStoreIdResolver(
  storeService: IStoreService,
): TStoreIdResolver {
  return async (storeSlug) =>
    storeService
      .getPublishedStoreBySlug(storeSlug)
      .then(({ store }) => store.id)
      .catch(() => undefined);
}

export interface IParamsCreateSocketServer {
  httpServer: HttpServer;
  tokenService: ITokenService;
  resolveStoreId: TStoreIdResolver;
  corsOrigins: string[];
}

function roomsFor(subject?: IAuthSubject, publicStoreId?: string): string[] {
  const rooms = publicStoreId ? [WS_ROOMS.storePublic(publicStoreId)] : [];
  if (subject?.subjectType === ESubjectType.STAFF && subject.storeId) {
    return [
      ...rooms,
      WS_ROOMS.storePublic(subject.storeId),
      WS_ROOMS.storeStaff(subject.storeId),
    ];
  }
  if (subject?.subjectType === ESubjectType.CUSTOMER) {
    return [...rooms, WS_ROOMS.customer(subject.subjectId)];
  }
  return rooms;
}

function verifySubject(
  tokenService: ITokenService,
  token: unknown,
): IAuthSubject | undefined {
  if (!token) {
    return undefined;
  }
  const payload = tokenService.verifyAccessToken(String(token));
  return {
    subjectId: payload.sub,
    subjectType: payload.typ,
    ...(payload.role && { role: payload.role }),
    ...(payload.storeId && { storeId: payload.storeId }),
  };
}

export function createSocketServer({
  httpServer,
  tokenService,
  resolveStoreId,
  corsOrigins,
}: IParamsCreateSocketServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.use((socket, next) => {
    try {
      socket.data.subject = verifySubject(
        tokenService,
        socket.handshake.auth?.token,
      );
    } catch {
      next(new Error('UNAUTHORIZED'));
      return;
    }
    const storeSlug: unknown = socket.handshake.auth?.storeSlug;
    if (!storeSlug) {
      next();
      return;
    }
    resolveStoreId(String(storeSlug))
      .then((storeId) => {
        if (!storeId) {
          next(new Error('STORE_NOT_FOUND'));
          return;
        }
        socket.data.publicStoreId = storeId;
        next();
      })
      .catch(() => next(new Error('STORE_NOT_FOUND')));
  });

  io.on('connection', (socket) => {
    const subject: IAuthSubject | undefined = socket.data.subject;
    void socket.join(roomsFor(subject, socket.data.publicStoreId));
    Logger.info('Socket connected', {
      eventName: 'ws.connected',
      subjectType: subject?.subjectType ?? 'ANONYMOUS',
    });
  });

  return io;
}
