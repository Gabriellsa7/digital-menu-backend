export interface IDeliveryZoneResolver {
  resolveDeliveryZoneId(
    storeId: string,
    neighborhood: string,
    city: string,
  ): Promise<string | undefined>;
}
