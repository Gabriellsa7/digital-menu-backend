import { Router, Request, Response, NextFunction } from 'express';
import { IController } from './controller.interface';
import { ITokenService } from '../../../domain/auth/interfaces/token.service.interface';
import {
  IOptionGroupService,
  IParamsOptionGroupData,
} from '../../../domain/option-group/interfaces/option-group.service.interface';
import { createAuthGuards, staffStoreId } from '../middlewares/auth-guards';
import { toOptionGroupResponse } from '../presenters/option-group.presenter';

type TIdParams = { id: string };
type TOptionParams = { id: string; optionId: string };

export interface IParamsOptionGroupController {
  optionGroupService: IOptionGroupService;
  tokenService: ITokenService;
}

export class OptionGroupController implements IController {
  router: Router;
  private readonly optionGroupService: IOptionGroupService;
  private readonly tokenService: ITokenService;

  constructor({
    optionGroupService,
    tokenService,
  }: IParamsOptionGroupController) {
    this.optionGroupService = optionGroupService;
    this.tokenService = tokenService;
    this.router = Router();
    this.initRoutes();
  }

  initRoutes() {
    const { staff } = createAuthGuards(this.tokenService);
    this.router.get('/admin/option-groups', ...staff, this.list);
    this.router.post('/admin/option-groups', ...staff, this.create);
    this.router.get('/admin/option-groups/:id', ...staff, this.get);
    this.router.put('/admin/option-groups/:id', ...staff, this.update);
    this.router.delete('/admin/option-groups/:id', ...staff, this.delete);
    this.router.patch(
      '/admin/option-groups/:id/options/:optionId/availability',
      ...staff,
      this.setOptionAvailability,
    );
  }

  list = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const optionGroups = await this.optionGroupService.listOptionGroups(
        staffStoreId(req),
      );
      res.status(200).json(optionGroups.map(toOptionGroupResponse));
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
      const optionGroup = await this.optionGroupService.getOptionGroupById(
        staffStoreId(req),
        req.params.id,
      );
      res.status(200).json(toOptionGroupResponse(optionGroup));
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
      const optionGroup = await this.optionGroupService.createOptionGroup(
        this.groupData(req),
      );
      res.status(201).json(toOptionGroupResponse(optionGroup));
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
      const optionGroup = await this.optionGroupService.updateOptionGroup({
        id: req.params.id,
        ...this.groupData(req),
      });
      res.status(200).json(toOptionGroupResponse(optionGroup));
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
      await this.optionGroupService.deleteOptionGroup(
        staffStoreId(req),
        req.params.id,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  setOptionAvailability = async (
    req: Request<TOptionParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const optionGroup = await this.optionGroupService.setOptionAvailability({
        storeId: staffStoreId(req),
        optionGroupId: req.params.id,
        optionId: req.params.optionId,
        isAvailable: req.body.isAvailable,
      });
      res.status(200).json(toOptionGroupResponse(optionGroup));
    } catch (error) {
      next(error);
    }
  };

  public getRoutes(): Router {
    return this.router;
  }

  private groupData(req: Request): IParamsOptionGroupData {
    const body: IParamsOptionGroupData = req.body;
    return {
      storeId: staffStoreId(req),
      name: body.name,
      minSelections: body.minSelections,
      maxSelections: body.maxSelections,
      allowRepeat: body.allowRepeat,
      options: body.options.map((option) => ({
        id: option.id,
        name: option.name,
        priceInCents: option.priceInCents,
        isAvailable: option.isAvailable,
      })),
    };
  }
}
