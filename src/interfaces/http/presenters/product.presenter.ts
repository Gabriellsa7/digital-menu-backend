import { IProduct } from '../../../domain/product/interfaces/product.interface';

export interface IProductResponse {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceInCents: number;
  imageUrl?: string;
  optionGroupIds: string[];
  isAvailable: boolean;
  isActive: boolean;
  position: number;
  servesPeople?: number;
  createdAt: Date;
}

export function toProductResponse(product: IProduct): IProductResponse {
  return {
    id: product.id,
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    priceInCents: product.priceInCents,
    ...(product.imageUrl && { imageUrl: product.imageUrl }),
    optionGroupIds: product.optionGroupIds,
    isAvailable: product.isAvailable,
    isActive: product.isActive,
    position: product.position,
    ...(product.servesPeople !== undefined && {
      servesPeople: product.servesPeople,
    }),
    createdAt: product.createdAt,
  };
}
