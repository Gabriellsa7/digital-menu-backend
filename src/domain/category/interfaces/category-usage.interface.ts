export interface ICategoryUsage {
  countProductsInCategory(categoryId: string): Promise<number>;
}
