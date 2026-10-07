import { IJob } from '../../jobs/job.interface';
import { ExpireUnpaidOrdersJob } from '../../jobs/expire-unpaid-orders.job';
import { PixAutoApproveJob } from '../../jobs/pix-auto-approve.job';
import { StoreStatusJob } from '../../jobs/store-status.job';
import { TickRunner } from '../../jobs/tick-runner';
import { env } from '../env';
import { PaymentServiceFactory } from './payment.service.factory';
import { StoreEventPublisherFactory } from './store-event-publisher.factory';
import { StoreServiceFactory } from './store.service.factory';

const TICK_INTERVAL_MILLISECONDS = 30 * 1000;

export class TickRunnerFactory {
  static create(): TickRunner {
    const paymentService = PaymentServiceFactory.create();
    const jobs: IJob[] = [
      new ExpireUnpaidOrdersJob(paymentService),
      new StoreStatusJob(
        StoreServiceFactory.create(),
        StoreEventPublisherFactory.create(),
      ),
    ];
    if (env.pixAutoApproveSeconds) {
      jobs.push(
        new PixAutoApproveJob(paymentService, env.pixAutoApproveSeconds),
      );
    }
    return new TickRunner(jobs, TICK_INTERVAL_MILLISECONDS);
  }
}
