import { IPaymentService } from '../../domain/payment/interfaces/payment.service.interface';
import { IJob } from './job.interface';

export class PixAutoApproveJob implements IJob {
  public readonly name = 'pix-auto-approve';

  constructor(
    private readonly paymentService: IPaymentService,
    private readonly approveAfterSeconds: number,
  ) {}

  async run(): Promise<void> {
    await this.paymentService.approvePendingPix(this.approveAfterSeconds);
  }
}
