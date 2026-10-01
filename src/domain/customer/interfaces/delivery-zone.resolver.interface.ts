export interface IDeliveryZoneResolver {
  resolveDeliveryZoneId(
    neighborhood: string,
    city: string,
  ): Promise<string | undefined>;
}
