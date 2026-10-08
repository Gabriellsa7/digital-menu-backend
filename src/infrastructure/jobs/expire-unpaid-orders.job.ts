import { IPaymentService } from '../../domain/payment/interfaces/payment.service.interface';
import { IJob } from './job.interface';

export class ExpireUnpaidOrdersJob implements IJob {
  public readonly name = 'expire-unpaid-orders';

  constructor(private readonly paymentService: IPaymentService) {}

  async run(): Promise<void> {
    await this.paymentService.expireUnpaidOrders();
  }
}
