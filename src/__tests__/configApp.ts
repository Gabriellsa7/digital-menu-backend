import path from 'path';
import { Server } from '../interfaces/http/server';
import { CustomerAuthControllerFactory } from '../infrastructure/config/factories/customer-auth.controller.factory';
import { CustomerControllerFactory } from '../infrastructure/config/factories/customer.controller.factory';
import { StaffUserControllerFactory } from '../infrastructure/config/factories/staff-user.controller.factory';
import { StoreControllerFactory } from '../infrastructure/config/factories/store.controller.factory';
import { StaffAuthControllerFactory } from '../infrastructure/config/factories/staff-auth.controller.factory';
import { MockSmsProvider } from '../infrastructure/sms/mock.sms.provider';
import { FakeGoogleIdentityVerifier } from './helpers/fake.google-identity.verifier';

const OPEN_API_SPEC_FILE_LOCATION = path.resolve(
  __dirname,
  '../contracts/service.yaml',
);

export const smsProvider = new MockSmsProvider();
const customerAuthAdapters = {
  googleIdentityVerifier: new FakeGoogleIdentityVerifier(),
  smsProvider,
};

export const app = new Server({
  port: Number(process.env.PORT) || 3000,
  controllers: [
    CustomerAuthControllerFactory.create(customerAuthAdapters),
    CustomerControllerFactory.create(customerAuthAdapters),
    StaffAuthControllerFactory.create(),
    StaffUserControllerFactory.create(),
    StoreControllerFactory.create(),
  ],
  databaseURI: process.env.DATABASE_URI,
  apiSpecLocation: OPEN_API_SPEC_FILE_LOCATION,
});
