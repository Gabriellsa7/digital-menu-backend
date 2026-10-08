import { ICategory } from '../../../domain/category/interfaces/category.interface';

export interface ICategoryResponse {
  id: string;
  name: string;
  position: number;
  isActive: boolean;
  createdAt: Date;
}

export function toCategoryResponse(category: ICategory): ICategoryResponse {
  return {
    id: category.id,
    name: category.name,
    position: category.position,
    isActive: category.isActive,
    createdAt: category.createdAt,
  };
}
