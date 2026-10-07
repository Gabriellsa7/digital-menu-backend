import { Router, Request, Response, NextFunction } from 'express';
import { IController } from './controller.interface';
import { ITokenService } from '../../../domain/auth/interfaces/token.service.interface';
import { IParamsQuoteOrder } from '../../../domain/order/interfaces/order-pricing.service.interface';
import { IOrderService } from '../../../domain/order/interfaces/order.service.interface';
import { createAuthGuards } from '../middlewares/auth-guards';
import {
  toOrderQuoteResponse,
  toOrderResponse,
} from '../presenters/order.presenter';

export interface IParamsCustomerOrderController {
  orderService: IOrderService;
  tokenService: ITokenService;
}

export class CustomerOrderController implements IController {
  router: Router;
  private readonly orderService: IOrderService;
  private readonly tokenService: ITokenService;

  constructor({ orderService, tokenService }: IParamsCustomerOrderController) {
    this.orderService = orderService;
    this.tokenService = tokenService;
    this.router = Router();
    this.initRoutes();
  }

  initRoutes() {
    const { customer } = createAuthGuards(this.tokenService);
    this.router.post('/me/orders/quote', ...customer, this.quote);
    this.router.post('/me/orders', ...customer, this.create);
  }

  quote = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const quote = await this.orderService.quoteOrder(this.cartData(req));
      res.status(200).json(toOrderQuoteResponse(quote));
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
      const order = await this.orderService.createOrder({
        ...this.cartData(req),
        notes: req.body.notes,
        idempotencyKey: req.get('Idempotency-Key'),
      });
      res.status(201).json(toOrderResponse(order));
    } catch (error) {
      next(error);
    }
  };

  public getRoutes(): Router {
    return this.router;
  }

  private cartData(req: Request): IParamsQuoteOrder {
    const { body } = req;
    return {
      customerId: req.auth!.subjectId,
      items: (body.items as IParamsQuoteOrder['items']).map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        options: (item.options ?? []).map((option) => ({
          groupId: option.groupId,
          optionId: option.optionId,
          quantity: option.quantity,
        })),
        notes: item.notes,
      })),
      fulfillmentType: body.fulfillmentType,
      addressId: body.addressId,
      couponCode: body.couponCode,
      paymentMethod: body.paymentMethod,
      changeForInCents: body.changeForInCents,
    };
  }
}
