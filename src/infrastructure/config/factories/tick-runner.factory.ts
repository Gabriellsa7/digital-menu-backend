import { IJob } from '../../jobs/job.interface';
import { ExpireUnpaidOrdersJob } from '../../jobs/expire-unpaid-orders.job';
import { PixAutoApproveJob } from '../../jobs/pix-auto-approve.job';
import { TickRunner } from '../../jobs/tick-runner';
import { env } from '../env';
import { PaymentServiceFactory } from './payment.service.factory';

const TICK_INTERVAL_MILLISECONDS = 30 * 1000;

export class TickRunnerFactory {
  static create(): TickRunner {
    const paymentService = PaymentServiceFactory.create();
    const jobs: IJob[] = [new ExpireUnpaidOrdersJob(paymentService)];
    if (env.pixAutoApproveSeconds) {
      jobs.push(
        new PixAutoApproveJob(paymentService, env.pixAutoApproveSeconds),
      );
    }
    return new TickRunner(jobs, TICK_INTERVAL_MILLISECONDS);
  }
}
