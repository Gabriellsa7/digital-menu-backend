export interface IBestSeller {
  productId: string;
  soldCount: number;
}

export interface IBestSellersReader {
  listBestSellers(
    storeId: string,
    since: Date,
    limit: number,
  ): Promise<IBestSeller[]>;
}
