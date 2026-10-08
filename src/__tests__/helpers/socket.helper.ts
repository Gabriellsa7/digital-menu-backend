import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { Server as SocketServer } from 'socket.io';
import { io as connect, Socket } from 'socket.io-client';
import { app } from '../../../jest/setup-integration-tests';
import { TokenServiceFactory } from '../../infrastructure/config/factories/token.service.factory';
import { createSocketServer } from '../../infrastructure/realtime/socket.server';

export interface ISocketTestServer {
  io: SocketServer;
  connectClient(token?: string): Promise<Socket>;
  close(): Promise<void>;
}

export async function startSocketTestServer(): Promise<ISocketTestServer> {
  const httpServer: HttpServer = createServer(app.app);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const io = createSocketServer({
    httpServer,
    tokenService: TokenServiceFactory.create(),
    corsOrigins: [],
  });
  const { port } = httpServer.address() as AddressInfo;
  const clients: Socket[] = [];

  return {
    io,
    connectClient: (token) =>
      new Promise((resolve, reject) => {
        const client = connect(`http://localhost:${port}`, {
          auth: token ? { token } : {},
          transports: ['websocket'],
          reconnection: false,
        });
        clients.push(client);
        client.on('connect', () => resolve(client));
        client.on('connect_error', reject);
      }),
    close: async () => {
      clients.forEach((client) => client.disconnect());
      await io.close();
    },
  };
}

export function waitForEvent<T>(
  client: Socket,
  event: string,
  timeoutMilliseconds = 2000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for ${event}`)),
      timeoutMilliseconds,
    );
    client.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}
