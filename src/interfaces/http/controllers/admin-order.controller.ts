import { Router, Request, Response, NextFunction } from 'express';
import { IController } from './controller.interface';
import { ITokenService } from '../../../domain/auth/interfaces/token.service.interface';
import { EOrderStatus } from '../../../domain/order/interfaces/order.interface';
import { IOrderService } from '../../../domain/order/interfaces/order.service.interface';
import { createAuthGuards, staffStoreId } from '../middlewares/auth-guards';
import {
  toOrderResponse,
  toOrderSummaryResponse,
} from '../presenters/order.presenter';

type TIdParams = { id: string };

const DEFAULT_PAGE_SIZE = 20;

export interface IParamsAdminOrderController {
  orderService: IOrderService;
  tokenService: ITokenService;
}

export class AdminOrderController implements IController {
  router: Router;
  private readonly orderService: IOrderService;
  private readonly tokenService: ITokenService;

  constructor({ orderService, tokenService }: IParamsAdminOrderController) {
    this.orderService = orderService;
    this.tokenService = tokenService;
    this.router = Router();
    this.initRoutes();
  }

  initRoutes() {
    const { staff } = createAuthGuards(this.tokenService);
    this.router.get('/admin/orders', ...staff, this.search);
    this.router.get('/admin/orders/active', ...staff, this.listActive);
    this.router.get('/admin/orders/:id', ...staff, this.get);
    this.router.patch('/admin/orders/:id/status', ...staff, this.changeStatus);
    this.router.post('/admin/orders/:id/reject', ...staff, this.reject);
    this.router.post('/admin/orders/:id/cancel', ...staff, this.cancel);
  }

  search = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { status, from, to, search } = req.query;
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? DEFAULT_PAGE_SIZE);
      const { items, total } = await this.orderService.searchOrders({
        storeId: staffStoreId(req),
        status: status as EOrderStatus | undefined,
        from: from ? new Date(String(from)) : undefined,
        to: to ? new Date(String(to)) : undefined,
        search: search as string | undefined,
        limit,
        offset: (page - 1) * limit,
      });
      res.status(200).json({
        items: items.map(toOrderSummaryResponse),
        total,
        page,
        limit,
      });
    } catch (error) {
      next(error);
    }
  };

  listActive = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const orders = await this.orderService.listActiveOrders(
        staffStoreId(req),
      );
      res.status(200).json(orders.map(toOrderResponse));
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
      const order = await this.orderService.getOrderById(
        staffStoreId(req),
        req.params.id,
      );
      res.status(200).json(toOrderResponse(order));
    } catch (error) {
      next(error);
    }
  };

  changeStatus = async (
    req: Request<TIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const order = await this.orderService.changeOrderStatus({
        storeId: staffStoreId(req),
        orderId: req.params.id,
        staffId: req.auth!.subjectId,
        status: req.body.status,
        estimatedMinutes: req.body.estimatedMinutes,
      });
      res.status(200).json(toOrderResponse(order));
    } catch (error) {
      next(error);
    }
  };

  reject = async (
    req: Request<TIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const order = await this.orderService.rejectOrder({
        storeId: staffStoreId(req),
        orderId: req.params.id,
        staffId: req.auth!.subjectId,
        reason: req.body.reason,
      });
      res.status(200).json(toOrderResponse(order));
    } catch (error) {
      next(error);
    }
  };

  cancel = async (
    req: Request<TIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const order = await this.orderService.cancelOrderByStaff({
        storeId: staffStoreId(req),
        orderId: req.params.id,
        staffId: req.auth!.subjectId,
        reason: req.body.reason,
      });
      res.status(200).json(toOrderResponse(order));
    } catch (error) {
      next(error);
    }
  };

  public getRoutes(): Router {
    return this.router;
  }
}
