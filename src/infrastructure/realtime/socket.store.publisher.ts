import {
  IParamsOptionAvailabilityChanged,
  IStoreEventPublisher,
} from '../../domain/store/events/store.event.publisher';
import { IStoreStatus } from '../../domain/store/interfaces/store.interface';
import {
  IProductAvailabilityChangedPayload,
  IStoreStatusChangedPayload,
  WS_EVENTS,
  WS_ROOMS,
} from '../../interfaces/ws/ws.events';
import { SocketEmitter } from './socket.emitter';

export class SocketStorePublisher implements IStoreEventPublisher {
  constructor(private readonly emitter: SocketEmitter) {}

  publishStoreStatusChanged(storeId: string, status: IStoreStatus): void {
    const payload: IStoreStatusChangedPayload = {
      isOpenNow: status.isOpenNow,
      manualStatus: status.manualStatus,
      ...(status.nextOpeningAt && {
        nextOpeningAt: status.nextOpeningAt.toISOString(),
      }),
      ...(status.closesAt && { closesAt: status.closesAt.toISOString() }),
    };
    this.emitter.emit(
      [WS_ROOMS.storePublic(storeId)],
      WS_EVENTS.STORE_STATUS_CHANGED,
      payload,
    );
  }

  publishProductAvailabilityChanged(
    storeId: string,
    productId: string,
    isAvailable: boolean,
  ): void {
    const payload: IProductAvailabilityChangedPayload = {
      productId,
      isAvailable,
    };
    this.emitter.emit(
      [WS_ROOMS.storePublic(storeId)],
      WS_EVENTS.PRODUCT_AVAILABILITY_CHANGED,
      payload,
    );
  }

  publishOptionAvailabilityChanged({
    storeId,
    ...payload
  }: IParamsOptionAvailabilityChanged): void {
    this.emitter.emit(
      [WS_ROOMS.storePublic(storeId)],
      WS_EVENTS.OPTION_AVAILABILITY_CHANGED,
      payload,
    );
  }
}
