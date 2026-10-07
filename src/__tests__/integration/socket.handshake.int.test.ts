import jwt from 'jsonwebtoken';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { loginCustomerWithOtp } from '../helpers/customer-session.helper';
import {
  ISocketTestServer,
  startSocketTestServer,
} from '../helpers/socket.helper';
import { loginAs } from '../helpers/staff-session.helper';

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
  it('should put an anonymous client only in the public room', async () => {
    const client = await server.connectClient();

    await expect(roomsOf(client.id!)).resolves.toEqual(['store:public']);
  });

  it('should put a staff client in the staff room', async () => {
    const { accessToken } = await loginAs(EStaffRole.STAFF);

    const client = await server.connectClient(accessToken);

    await expect(roomsOf(client.id!)).resolves.toEqual([
      'store:public',
      'store:staff',
    ]);
  });

  it('should put a customer only in the own room', async () => {
    const { accessToken, customerId } = await loginCustomerWithOtp();

    const client = await server.connectClient(accessToken);

    await expect(roomsOf(client.id!)).resolves.toEqual([
      `customer:${customerId}`,
      'store:public',
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
