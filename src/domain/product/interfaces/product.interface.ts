export interface IProduct {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceInCents: number;
  imageUrl?: string;
  imagePublicId?: string;
  /** Display order of the add-on groups in the product modal */
  optionGroupIds: string[];
  isAvailable: boolean;
  isActive: boolean;
  position: number;
  servesPeople?: number;
  createdAt: Date;
  updatedAt: Date;
}
