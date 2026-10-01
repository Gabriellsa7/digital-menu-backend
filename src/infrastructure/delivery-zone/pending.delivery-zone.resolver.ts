import { IDeliveryZoneResolver } from '../../domain/customer/interfaces/delivery-zone.resolver.interface';

/**
 * Temporary resolver until the delivery-zone module exists: every address is
 * saved as "not served". Replace it in CustomerServiceFactory with an
 * implementation backed by the delivery-zone service.
 */
export class PendingDeliveryZoneResolver implements IDeliveryZoneResolver {
  async resolveDeliveryZoneId(): Promise<string | undefined> {
    return undefined;
  }
}
