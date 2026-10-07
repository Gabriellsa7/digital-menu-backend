import { IStoreEventPublisher } from '../../../domain/store/events/store.event.publisher';
import { socketEmitter } from '../../realtime/socket.emitter';
import { SocketStorePublisher } from '../../realtime/socket.store.publisher';

export class StoreEventPublisherFactory {
  static create(): IStoreEventPublisher {
    return new SocketStorePublisher(socketEmitter);
  }
}
