export interface IOptionGroupUsage {
  countProductsUsingOptionGroup(optionGroupId: string): Promise<number>;
}
