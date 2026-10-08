import './infrastructure/telemetry/tracing';
import path from 'path';
import { Logger } from 'traceability';
import { Server } from './interfaces/http/server';
import { env } from './infrastructure/config/env';

import { CustomerAuthControllerFactory } from './infrastructure/config/factories/customer-auth.controller.factory';
import { CustomerControllerFactory } from './infrastructure/config/factories/customer.controller.factory';
import { StaffUserControllerFactory } from './infrastructure/config/factories/staff-user.controller.factory';
import { StoreControllerFactory } from './infrastructure/config/factories/store.controller.factory';
import { DeliveryZoneControllerFactory } from './infrastructure/config/factories/delivery-zone.controller.factory';
import { CategoryControllerFactory } from './infrastructure/config/factories/category.controller.factory';
import { OptionGroupControllerFactory } from './infrastructure/config/factories/option-group.controller.factory';
import { ProductControllerFactory } from './infrastructure/config/factories/product.controller.factory';
import { MenuControllerFactory } from './infrastructure/config/factories/menu.controller.factory';
import { CouponControllerFactory } from './infrastructure/config/factories/coupon.controller.factory';
import { CustomerOrderControllerFactory } from './infrastructure/config/factories/customer-order.controller.factory';
import { AdminOrderControllerFactory } from './infrastructure/config/factories/admin-order.controller.factory';
import { StaffAuthControllerFactory } from './infrastructure/config/factories/staff-auth.controller.factory';
import { StaffUserServiceFactory } from './infrastructure/config/factories/staff-user.service.factory';
import { StoreServiceFactory } from './infrastructure/config/factories/store.service.factory';
import { ensureOwner } from './infrastructure/bootstrap/ensure-owner';
import { TickRunnerFactory } from './infrastructure/config/factories/tick-runner.factory';
import { TokenServiceFactory } from './infrastructure/config/factories/token.service.factory';
import { createSocketServer } from './infrastructure/realtime/socket.server';
import { socketEmitter } from './infrastructure/realtime/socket.emitter';

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
    StoreControllerFactory.create(),
    DeliveryZoneControllerFactory.create(),
    CategoryControllerFactory.create(),
    OptionGroupControllerFactory.create(),
    ProductControllerFactory.create(),
    MenuControllerFactory.create(),
    CouponControllerFactory.create(),
    CustomerOrderControllerFactory.create(),
    AdminOrderControllerFactory.create(),
  ],
  databaseURI: env.databaseUri,
  apiSpecLocation: OPEN_API_SPEC_FILE_LOCATION,
});

async function start() {
  await app.databaseSetup();
  const store = await StoreServiceFactory.create().getStore();
  await ensureOwner({
    staffUserService: StaffUserServiceFactory.create(),
    storeId: store.id,
    name: env.bootstrapOwnerName,
    email: env.bootstrapOwnerEmail,
    password: env.bootstrapOwnerPassword,
  });
  const httpServer = app.listen();
  const io = createSocketServer({
    httpServer,
    tokenService: TokenServiceFactory.create(),
    corsOrigins: env.corsOrigins,
  });
  socketEmitter.attach(io);
  const tickRunner = TickRunnerFactory.create();
  tickRunner.start();

  const shutdown = (signal: string) => {
    Logger.info(`Received ${signal}, shutting down gracefully`, {
      eventName: 'app.shutdown',
      process: 'Application',
    });
    tickRunner.stop();
    socketEmitter.detach();
    void io.close(async () => {
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
