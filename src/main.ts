import './infrastructure/telemetry/tracing';
import path from 'path';
import { Logger } from 'traceability';
import { Server } from './interfaces/http/server';
import { env } from './infrastructure/config/env';

import { CustomerAuthControllerFactory } from './infrastructure/config/factories/customer-auth.controller.factory';
import { CustomerControllerFactory } from './infrastructure/config/factories/customer.controller.factory';
import { StaffUserControllerFactory } from './infrastructure/config/factories/staff-user.controller.factory';
import { StaffAuthControllerFactory } from './infrastructure/config/factories/staff-auth.controller.factory';
import { StaffUserServiceFactory } from './infrastructure/config/factories/staff-user.service.factory';
import { ensureOwner } from './infrastructure/bootstrap/ensure-owner';

const OPEN_API_SPEC_FILE_LOCATION = path.resolve(
  __dirname,
  './contracts/service.yaml',
);

const SHUTDOWN_TIMEOUT_MILLISECONDS = 10000;

const app = new Server({
  port: env.port,
  controllers: [
    CustomerAuthControllerFactory.create(),
    CustomerControllerFactory.create(),
    StaffAuthControllerFactory.create(),
    StaffUserControllerFactory.create(),
  ],
  databaseURI: env.databaseUri,
  apiSpecLocation: OPEN_API_SPEC_FILE_LOCATION,
});

async function start() {
  await app.databaseSetup();
  await ensureOwner({
    staffUserService: StaffUserServiceFactory.create(),
    name: env.bootstrapOwnerName,
    email: env.bootstrapOwnerEmail,
    password: env.bootstrapOwnerPassword,
  });
  const httpServer = app.listen();

  const shutdown = (signal: string) => {
    Logger.info(`Received ${signal}, shutting down gracefully`, {
      eventName: 'app.shutdown',
      process: 'Application',
    });
    httpServer.close(async () => {
      await app.closeDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MILLISECONDS).unref();
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  Logger.error((error as Error).message, {
    eventName: 'app.bootstrap_error',
    stack: (error as Error).stack,
  });
  process.exit(1);
});
