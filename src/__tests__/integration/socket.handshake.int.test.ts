import jwt from 'jsonwebtoken';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { loginCustomerWithOtp } from '../helpers/customer-session.helper';
import {
  ISocketTestServer,
  startSocketTestServer,
} from '../helpers/socket.helper';
import { createStore, loginAs } from '../helpers/staff-session.helper';

let server: ISocketTestServer;

async function roomsOf(socketId: string): Promise<string[]> {
  const sockets = await server.io.fetchSockets();
  const socket = sockets.find(({ id }) => id === socketId);
  return [...(socket?.rooms ?? [])].filter((room) => room !== socketId).sort();
}

beforeEach(async () => {
  server = await startSocketTestServer();
});

afterEach(async () => {
  await server.close();
});

describe('When a client connects to the realtime server', () => {
  it('should put an anonymous client only in the public room of the store', async () => {
    const store = await createStore('Casa Brasa');

    const client = await server.connectClient(undefined, store.slug);

    await expect(roomsOf(client.id!)).resolves.toEqual([
      `store:${store.id}:public`,
    ]);
  });

  it('should reject an unknown store slug with STORE_NOT_FOUND', async () => {
    await expect(
      server.connectClient(undefined, 'unknown-store'),
    ).rejects.toThrow('STORE_NOT_FOUND');
  });

  it('should put a staff client in the rooms of the token store', async () => {
    const { accessToken, staffUser } = await loginAs(EStaffRole.STAFF);

    const client = await server.connectClient(accessToken);

    await expect(roomsOf(client.id!)).resolves.toEqual([
      `store:${staffUser.storeId}:public`,
      `store:${staffUser.storeId}:staff`,
    ]);
  });

  it('should put a customer in the own room and the visited store', async () => {
    const store = await createStore('Casa Brasa');
    const { accessToken, customerId } = await loginCustomerWithOtp();

    const client = await server.connectClient(accessToken, store.slug);

    await expect(roomsOf(client.id!)).resolves.toEqual([
      `customer:${customerId}`,
      `store:${store.id}:public`,
    ]);
  });

  it('should reject an expired token with UNAUTHORIZED', async () => {
    const expired = jwt.sign(
      { sub: 'customer-1', typ: 'CUSTOMER' },
      String(process.env.JWT_ACCESS_SECRET),
      { expiresIn: -10 },
    );

    await expect(server.connectClient(expired)).rejects.toThrow(
      'UNAUTHORIZED',
    );
  });
});
