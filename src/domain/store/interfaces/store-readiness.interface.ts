export interface IStoreReadiness {
  countSellableProducts(storeId: string): Promise<number>;
}
