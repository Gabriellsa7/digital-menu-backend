import { Logger } from 'traceability';
import {
  IParamsSendSms,
  ISmsProvider,
} from '../../domain/otp/interfaces/sms.provider.interface';

const MAX_KEPT_MESSAGES = 50;

/**
 * SMS is simulated in the MVP: nothing leaves the server. The last messages
 * are kept in memory so tests can read them.
 */
export class MockSmsProvider implements ISmsProvider {
  private readonly messages: IParamsSendSms[] = [];

  async sendSms(params: IParamsSendSms): Promise<void> {
    this.messages.push(params);
    if (this.messages.length > MAX_KEPT_MESSAGES) {
      this.messages.shift();
    }
    Logger.info('SMS mocked', {
      eventName: 'sms.mocked',
      to: `${params.to.slice(0, 5)}*****${params.to.slice(-2)}`,
    });
  }

  get sentMessages(): readonly IParamsSendSms[] {
    return this.messages;
  }
}
