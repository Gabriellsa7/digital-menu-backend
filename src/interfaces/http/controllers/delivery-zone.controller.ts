import { Router, Request, Response, NextFunction } from 'express';
import { IController } from './controller.interface';
import { ITokenService } from '../../../domain/auth/interfaces/token.service.interface';
import {
  IDeliveryZoneService,
  IParamsDeliveryZoneData,
} from '../../../domain/delivery-zone/interfaces/delivery-zone.service.interface';
import { createAuthGuards } from '../middlewares/auth-guards';
import {
  toDeliveryZoneResponse,
  toPublicDeliveryZoneResponse,
} from '../presenters/delivery-zone.presenter';

type TIdParams = { id: string };

export interface IParamsDeliveryZoneController {
  deliveryZoneService: IDeliveryZoneService;
  tokenService: ITokenService;
}

export class DeliveryZoneController implements IController {
  router: Router;
  private readonly deliveryZoneService: IDeliveryZoneService;
  private readonly tokenService: ITokenService;

  constructor({
    deliveryZoneService,
    tokenService,
  }: IParamsDeliveryZoneController) {
    this.deliveryZoneService = deliveryZoneService;
    this.tokenService = tokenService;
    this.router = Router();
    this.initRoutes();
  }

  initRoutes() {
    const { staff, owner } = createAuthGuards(this.tokenService);
    this.router.get('/public/delivery-zones', this.listPublic);
    this.router.get('/public/delivery-zones/resolve', this.resolve);
    this.router.get('/admin/delivery-zones', ...staff, this.listAdmin);
    this.router.post('/admin/delivery-zones', ...owner, this.create);
    this.router.put('/admin/delivery-zones/:id', ...owner, this.update);
    this.router.delete('/admin/delivery-zones/:id', ...owner, this.delete);
  }

  listPublic = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const zones = await this.deliveryZoneService.listDeliveryZones(true);
      res.status(200).json(zones.map(toPublicDeliveryZoneResponse));
    } catch (error) {
      next(error);
    }
  };

  resolve = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const zone = await this.deliveryZoneService.resolveDeliveryZone(
        String(req.query.neighborhood),
        String(req.query.city),
      );
      res.status(200).json(toPublicDeliveryZoneResponse(zone));
    } catch (error) {
      next(error);
    }
  };

  listAdmin = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const zones = await this.deliveryZoneService.listDeliveryZones(false);
      res.status(200).json(zones.map(toDeliveryZoneResponse));
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
      const zone = await this.deliveryZoneService.createDeliveryZone({
        ...this.zoneData(req.body),
        isActive: req.body.isActive ?? true,
      });
      res.status(201).json(toDeliveryZoneResponse(zone));
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
      const zone = await this.deliveryZoneService.updateDeliveryZone({
        id: req.params.id,
        ...this.zoneData(req.body),
        isActive: req.body.isActive,
      });
      res.status(200).json(toDeliveryZoneResponse(zone));
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
      await this.deliveryZoneService.deleteDeliveryZone(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  public getRoutes(): Router {
    return this.router;
  }

  private zoneData(
    body: Record<string, unknown>,
  ): Omit<IParamsDeliveryZoneData, 'isActive'> {
    return {
      displayName: body.name as string,
      city: body.city as string,
      feeInCents: body.feeInCents as number,
      etaMinMinutes: body.etaMinMinutes as number,
      etaMaxMinutes: body.etaMaxMinutes as number,
    };
  }
}
