import { Router, Request, Response, NextFunction } from 'express';
import { IController } from './controller.interface';
import { ITokenService } from '../../../domain/auth/interfaces/token.service.interface';
import { ICategoryService } from '../../../domain/category/interfaces/category.service.interface';
import { createAuthGuards } from '../middlewares/auth-guards';
import { toCategoryResponse } from '../presenters/category.presenter';

type TIdParams = { id: string };

export interface IParamsCategoryController {
  categoryService: ICategoryService;
  tokenService: ITokenService;
}

export class CategoryController implements IController {
  router: Router;
  private readonly categoryService: ICategoryService;
  private readonly tokenService: ITokenService;

  constructor({ categoryService, tokenService }: IParamsCategoryController) {
    this.categoryService = categoryService;
    this.tokenService = tokenService;
    this.router = Router();
    this.initRoutes();
  }

  initRoutes() {
    const { staff } = createAuthGuards(this.tokenService);
    this.router.get('/admin/categories', ...staff, this.list);
    this.router.post('/admin/categories', ...staff, this.create);
    this.router.put('/admin/categories/order', ...staff, this.reorder);
    this.router.put('/admin/categories/:id', ...staff, this.update);
    this.router.delete('/admin/categories/:id', ...staff, this.delete);
  }

  list = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const categories = await this.categoryService.listCategories();
      res.status(200).json(categories.map(toCategoryResponse));
    } catch (error) {
      next(error);
    }
  };

  create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const category = await this.categoryService.createCategory({
        name: req.body.name,
        isActive: req.body.isActive,
      });
      res.status(201).json(toCategoryResponse(category));
    } catch (error) {
      next(error);
    }
  };

  update = async (
    req: Request<TIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const category = await this.categoryService.updateCategory({
        id: req.params.id,
        name: req.body.name,
        isActive: req.body.isActive,
      });
      res.status(200).json(toCategoryResponse(category));
    } catch (error) {
      next(error);
    }
  };

  delete = async (
    req: Request<TIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.categoryService.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  reorder = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const categories = await this.categoryService.reorderCategories(
        req.body.ids,
      );
      res.status(200).json(categories.map(toCategoryResponse));
    } catch (error) {
      next(error);
    }
  };

  public getRoutes(): Router {
    return this.router;
  }
}
