import { Router, Request, Response, NextFunction } from 'express';
import { IController } from './controller.interface';
import { IMenuService } from '../../../domain/menu/interfaces/menu.service.interface';
import { IStoreHomeService } from '../../../domain/menu/interfaces/store-home.service.interface';

const PUBLIC_CACHE_CONTROL = 'public, max-age=30';

export interface IParamsMenuController {
  menuService: IMenuService;
  storeHomeService: IStoreHomeService;
}

export class MenuController implements IController {
  router: Router;
  private readonly menuService: IMenuService;
  private readonly storeHomeService: IStoreHomeService;

  constructor({ menuService, storeHomeService }: IParamsMenuController) {
    this.menuService = menuService;
    this.storeHomeService = storeHomeService;
    this.router = Router();
    this.initRoutes();
  }

  initRoutes() {
    this.router.get('/public/stores/:slug/home', this.getHome);
    this.router.get('/public/stores/:slug/menu', this.getMenu);
    this.router.get('/public/stores/:slug/products/:id', this.getProduct);
  }

  getHome = async (
    req: Request<{ slug: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const home = await this.storeHomeService.getStoreHome(req.params.slug);
      res.set('Cache-Control', PUBLIC_CACHE_CONTROL).status(200).json(home);
    } catch (error) {
      next(error);
    }
  };

  getMenu = async (
    req: Request<{ slug: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const menu = await this.menuService.getMenu(req.params.slug);
      res.set('Cache-Control', PUBLIC_CACHE_CONTROL).status(200).json(menu);
    } catch (error) {
      next(error);
    }
  };

  getProduct = async (
    req: Request<{ slug: string; id: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const product = await this.menuService.getMenuProduct(
        req.params.slug,
        req.params.id,
      );
      res.set('Cache-Control', PUBLIC_CACHE_CONTROL).status(200).json(product);
    } catch (error) {
      next(error);
    }
  };

  public getRoutes(): Router {
    return this.router;
  }
}
