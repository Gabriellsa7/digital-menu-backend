import path from 'path';
import { Server } from '../interfaces/http/server';
import { UserControllerFactory } from '../infrastructure/config/factories/user.controller.factory';
import { CustomerAuthControllerFactory } from '../infrastructure/config/factories/customer-auth.controller.factory';
import { CustomerControllerFactory } from '../infrastructure/config/factories/customer.controller.factory';
import { MockSmsProvider } from '../infrastructure/sms/mock.sms.provider';
import { FakeGoogleIdentityVerifier } from './helpers/fake.google-identity.verifier';

const OPEN_API_SPEC_FILE_LOCATION = path.resolve(
  __dirname,
  '../contracts/service.yaml',
);

// Shared with the tests so they can read the simulated SMS messages
export const smsProvider = new MockSmsProvider();
const customerAuthAdapters = {
  googleIdentityVerifier: new FakeGoogleIdentityVerifier(),
  smsProvider,
};

export const app = new Server({
  port: Number(process.env.PORT) || 3000,
  controllers: [
    UserControllerFactory.create(),
    CustomerAuthControllerFactory.create(customerAuthAdapters),
    CustomerControllerFactory.create(customerAuthAdapters),
  ],
  databaseURI: process.env.DATABASE_URI,
  apiSpecLocation: OPEN_API_SPEC_FILE_LOCATION,
});
