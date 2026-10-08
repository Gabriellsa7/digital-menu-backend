import { Router, Request, Response, NextFunction } from 'express';
import { IController } from './controller.interface';
import { ITokenService } from '../../../domain/auth/interfaces/token.service.interface';
import {
  EStoreImageKind,
  IStoreService,
} from '../../../domain/store/interfaces/store.service.interface';
import { createAuthGuards, staffStoreId } from '../middlewares/auth-guards';
import {
  imageUpload,
  uploadedImage,
} from '../middlewares/image-upload.middleware';
import { toStoreResponse } from '../presenters/store.presenter';

export interface IParamsStoreController {
  storeService: IStoreService;
  tokenService: ITokenService;
}

export class StoreController implements IController {
  router: Router;
  private readonly storeService: IStoreService;
  private readonly tokenService: ITokenService;

  constructor({ storeService, tokenService }: IParamsStoreController) {
    this.storeService = storeService;
    this.tokenService = tokenService;
    this.router = Router();
    this.initRoutes();
  }

  initRoutes() {
    const { staff, owner } = createAuthGuards(this.tokenService);
    this.router.get('/public/store', this.getPublicStore);
    this.router.get('/admin/store', ...staff, this.getStore);
    this.router.put('/admin/store', ...owner, this.updateStore);
    this.router.put(
      '/admin/store/opening-hours',
      ...owner,
      this.setOpeningHours,
    );
    this.router.patch('/admin/store/status', ...staff, this.setManualStatus);
    this.router.post(
      '/admin/store/images/:kind',
      ...owner,
      imageUpload,
      this.setImage,
    );
  }

  getPublicStore = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const store = await this.storeService.ensureDefaultStore();
      const storeWithStatus = await this.storeService.getStoreWithStatus(
        store.id,
      );
      res.status(200).json(toStoreResponse(storeWithStatus));
    } catch (error) {
      next(error);
    }
  };

  getStore = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const storeWithStatus = await this.storeService.getStoreWithStatus(
        staffStoreId(req),
      );
      res.status(200).json(toStoreResponse(storeWithStatus));
    } catch (error) {
      next(error);
    }
  };

  updateStore = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.storeService.updateStore(staffStoreId(req), req.body);
      await this.getStore(req, res, next);
    } catch (error) {
      next(error);
    }
  };

  setOpeningHours = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.storeService.setOpeningHours(
        staffStoreId(req),
        req.body.openingHours,
      );
      await this.getStore(req, res, next);
    } catch (error) {
      next(error);
    }
  };

  setManualStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const storeWithStatus = await this.storeService.setManualStatus(
        staffStoreId(req),
        req.body.manualStatus,
      );
      res.status(200).json(toStoreResponse(storeWithStatus));
    } catch (error) {
      next(error);
    }
  };

  setImage = async (
    req: Request<{ kind: EStoreImageKind }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.storeService.setStoreImage(
        staffStoreId(req),
        req.params.kind,
        uploadedImage(req),
      );
      await this.getStore(req, res, next);
    } catch (error) {
      next(error);
    }
  };

  public getRoutes(): Router {
    return this.router;
  }
}
