import { TickRunner } from '../../infrastructure/jobs/tick-runner';
import { ExpireUnpaidOrdersJob } from '../../infrastructure/jobs/expire-unpaid-orders.job';
import { PixAutoApproveJob } from '../../infrastructure/jobs/pix-auto-approve.job';
import { IPaymentService } from '../../domain/payment/interfaces/payment.service.interface';

describe('When the tick runner runs its jobs', () => {
  it('should skip a job that is still running', async () => {
    let release: () => void = () => undefined;
    const run = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const runner = new TickRunner([{ name: 'slow', run }], 1000);

    const first = runner.tick();
    await runner.tick();
    release();
    await first;

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('should keep running other jobs when one fails', async () => {
    const healthy = jest.fn().mockResolvedValue(undefined);
    const runner = new TickRunner(
      [
        { name: 'broken', run: jest.fn().mockRejectedValue(new Error('boom')) },
        { name: 'healthy', run: healthy },
      ],
      1000,
    );

    await expect(runner.tick()).resolves.toBeUndefined();
    expect(healthy).toHaveBeenCalled();
  });

  it('should start and stop the interval', async () => {
    jest.useFakeTimers();
    const run = jest.fn().mockResolvedValue(undefined);
    const runner = new TickRunner([{ name: 'job', run }], 1000);

    runner.start();
    await jest.advanceTimersByTimeAsync(2500);
    runner.stop();
    await jest.advanceTimersByTimeAsync(5000);
    jest.useRealTimers();

    expect(run).toHaveBeenCalledTimes(2);
  });
});

describe('When the payment jobs run (PAY-R02, R06)', () => {
  it('should call the payment service', async () => {
    const paymentService = {
      expireUnpaidOrders: jest.fn(),
      approvePendingPix: jest.fn(),
    } as unknown as jest.Mocked<IPaymentService>;

    await new ExpireUnpaidOrdersJob(paymentService).run();
    await new PixAutoApproveJob(paymentService, 30).run();

    expect(paymentService.expireUnpaidOrders).toHaveBeenCalled();
    expect(paymentService.approvePendingPix).toHaveBeenCalledWith(30);
  });
});
