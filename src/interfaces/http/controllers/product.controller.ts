import { Router, Request, Response, NextFunction } from 'express';
import { IController } from './controller.interface';
import { ITokenService } from '../../../domain/auth/interfaces/token.service.interface';
import {
  IParamsProductData,
  IProductService,
} from '../../../domain/product/interfaces/product.service.interface';
import { createAuthGuards, staffStoreId } from '../middlewares/auth-guards';
import {
  imageUpload,
  uploadedImage,
} from '../middlewares/image-upload.middleware';
import { toProductResponse } from '../presenters/product.presenter';

type TIdParams = { id: string };

const DEFAULT_PAGE_SIZE = 20;

export interface IParamsProductController {
  productService: IProductService;
  tokenService: ITokenService;
}

export class ProductController implements IController {
  router: Router;
  private readonly productService: IProductService;
  private readonly tokenService: ITokenService;

  constructor({ productService, tokenService }: IParamsProductController) {
    this.productService = productService;
    this.tokenService = tokenService;
    this.router = Router();
    this.initRoutes();
  }

  initRoutes() {
    const { staff } = createAuthGuards(this.tokenService);
    this.router.get('/admin/products', ...staff, this.list);
    this.router.post('/admin/products', ...staff, this.create);
    this.router.get('/admin/products/:id', ...staff, this.get);
    this.router.put('/admin/products/:id', ...staff, this.update);
    this.router.delete('/admin/products/:id', ...staff, this.delete);
    this.router.patch(
      '/admin/products/:id/availability',
      ...staff,
      this.setAvailability,
    );
    this.router.post(
      '/admin/products/:id/image',
      ...staff,
      imageUpload,
      this.setImage,
    );
    this.router.delete('/admin/products/:id/image', ...staff, this.removeImage);
    this.router.put(
      '/admin/categories/:id/products/order',
      ...staff,
      this.reorder,
    );
  }

  list = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? DEFAULT_PAGE_SIZE);
      const { items, total } = await this.productService.listProducts({
        storeId: staffStoreId(req),
        categoryId: req.query.categoryId as string | undefined,
        search: req.query.search as string | undefined,
        limit,
        offset: (page - 1) * limit,
      });
      res
        .status(200)
        .json({ items: items.map(toProductResponse), total, page, limit });
    } catch (error) {
      next(error);
    }
  };

  get = async (
    req: Request<TIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const product = await this.productService.getProductById(
        staffStoreId(req),
        req.params.id,
      );
      res.status(200).json(toProductResponse(product));
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
      const product = await this.productService.createProduct(
        this.productData(req),
      );
      res.status(201).json(toProductResponse(product));
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
      const product = await this.productService.updateProduct({
        id: req.params.id,
        ...this.productData(req),
      });
      res.status(200).json(toProductResponse(product));
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
      await this.productService.deleteProduct(
        staffStoreId(req),
        req.params.id,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  setAvailability = async (
    req: Request<TIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const product = await this.productService.setProductAvailability({
        storeId: staffStoreId(req),
        id: req.params.id,
        isAvailable: req.body.isAvailable,
      });
      res.status(200).json(toProductResponse(product));
    } catch (error) {
      next(error);
    }
  };

  reorder = async (
    req: Request<TIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const products = await this.productService.reorderProductsInCategory(
        staffStoreId(req),
        req.params.id,
        req.body.ids,
      );
      res.status(200).json(products.map(toProductResponse));
    } catch (error) {
      next(error);
    }
  };

  setImage = async (
    req: Request<TIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const product = await this.productService.setProductImage(
        staffStoreId(req),
        req.params.id,
        uploadedImage(req),
      );
      res.status(200).json(toProductResponse(product));
    } catch (error) {
      next(error);
    }
  };

  removeImage = async (
    req: Request<TIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const product = await this.productService.removeProductImage(
        staffStoreId(req),
        req.params.id,
      );
      res.status(200).json(toProductResponse(product));
    } catch (error) {
      next(error);
    }
  };

  public getRoutes(): Router {
    return this.router;
  }

  private productData(req: Request): IParamsProductData {
    const body: IParamsProductData = req.body;
    return {
      storeId: staffStoreId(req),
      categoryId: body.categoryId,
      name: body.name,
      description: body.description ?? '',
      priceInCents: body.priceInCents,
      optionGroupIds: body.optionGroupIds ?? [],
      isAvailable: body.isAvailable ?? true,
      isActive: body.isActive ?? true,
      servesPeople: body.servesPeople,
    };
  }
}
