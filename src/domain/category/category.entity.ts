import { ICategory } from './interfaces/category.interface';

export class Category implements ICategory {
  public readonly id: string;
  public readonly name: string;
  public readonly position: number;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: ICategory) {
    this.id = props.id;
    this.name = props.name.trim();
    this.position = props.position;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
