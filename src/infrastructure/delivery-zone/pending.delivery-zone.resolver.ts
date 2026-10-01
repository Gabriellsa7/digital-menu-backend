import { IDeliveryZoneResolver } from '../../domain/customer/interfaces/delivery-zone.resolver.interface';

export class PendingDeliveryZoneResolver implements IDeliveryZoneResolver {
  async resolveDeliveryZoneId(): Promise<string | undefined> {
    return undefined;
  }
}
