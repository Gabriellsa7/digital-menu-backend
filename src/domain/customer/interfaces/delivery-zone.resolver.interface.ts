/**
 * Port the customer module uses to find which delivery zone serves an
 * address (CUS-R03), without depending on the delivery-zone module directly.
 */
export interface IDeliveryZoneResolver {
  /**
   * @returns The id of the active zone serving the neighborhood, or
   * undefined when the address is not served
   */
  resolveDeliveryZoneId(
    neighborhood: string,
    city: string,
  ): Promise<string | undefined>;
}
