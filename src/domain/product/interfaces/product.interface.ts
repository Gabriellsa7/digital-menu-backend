export interface IProduct {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceInCents: number;
  imageUrl?: string;
  imagePublicId?: string;
  optionGroupIds: string[];
  isAvailable: boolean;
  isActive: boolean;
  position: number;
  servesPeople?: number;
  createdAt: Date;
  updatedAt: Date;
}
