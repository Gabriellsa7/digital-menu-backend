import { IOrderEventPublisher } from '../../../domain/order/events/order.event.publisher';
import { socketEmitter } from '../../realtime/socket.emitter';
import { SocketOrderPublisher } from '../../realtime/socket.order.publisher';

export class OrderEventPublisherFactory {
  static create(): IOrderEventPublisher {
    return new SocketOrderPublisher(socketEmitter);
  }
}
