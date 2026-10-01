import '../types/express-request';
import { Router, Request, Response, NextFunction } from 'express';
import { IController } from './controller.interface';
import { ESubjectType } from '../../../domain/auth/interfaces/auth-subject.interface';
import { ICustomerAuthService } from '../../../domain/auth/interfaces/customer-auth.service.interface';
import { ITokenService } from '../../../domain/auth/interfaces/token.service.interface';
import {
  ICustomerService,
  IParamsAddressData,
} from '../../../domain/customer/interfaces/customer.service.interface';
import { authenticate } from '../middlewares/authenticate.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import {
  toAddressResponse,
  toCustomerResponse,
} from '../presenters/customer.presenter';

type TAddressParams = { addressId: string };

export interface IParamsCustomerController {
  customerService: ICustomerService;
  customerAuthService: ICustomerAuthService;
  tokenService: ITokenService;
}

export class CustomerController implements IController {
  router: Router;
  private readonly customerService: ICustomerService;
  private readonly customerAuthService: ICustomerAuthService;
  private readonly tokenService: ITokenService;

  constructor({
    customerService,
    customerAuthService,
    tokenService,
  }: IParamsCustomerController) {
    this.customerService = customerService;
    this.customerAuthService = customerAuthService;
    this.tokenService = tokenService;
    this.router = Router();
    this.initRoutes();
  }

  initRoutes() {
    // Scoped to /me so the guard never runs for other controllers' routes
    this.router.use(
      '/me',
      authenticate(this.tokenService),
      authorize({ subjectType: ESubjectType.CUSTOMER }),
    );
    this.router.get('/me', this.getProfile);
    this.router.patch('/me', this.updateProfile);
    this.router.post('/me/identities/google', this.linkGoogleAccount);
    this.router.get('/me/addresses', this.listAddresses);
    this.router.post('/me/addresses', this.addAddress);
    this.router.put('/me/addresses/:addressId', this.updateAddress);
    this.router.delete('/me/addresses/:addressId', this.removeAddress);
    this.router.patch(
      '/me/addresses/:addressId/default',
      this.setDefaultAddress,
    );
  }

  /**
   * Fetch the logged-in customer
   */
  getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const customer = await this.customerService.getCustomerById(
        this.customerId(req),
      );
      res.status(200).json(toCustomerResponse(customer));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update the name and/or the contact phone (null removes it)
   */
  updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { name, phone } = req.body;
    try {
      const customer = await this.customerService.updateCustomerProfile({
        customerId: this.customerId(req),
        name,
        phone,
      });
      res.status(200).json(toCustomerResponse(customer));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Link a Google account to the logged-in customer
   */
  linkGoogleAccount = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const customer = await this.customerAuthService.linkGoogleAccount(
        this.customerId(req),
        req.body.idToken,
      );
      res.status(200).json(toCustomerResponse(customer));
    } catch (error) {
      next(error);
    }
  };

  /**
   * List the saved addresses
   */
  listAddresses = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const addresses = await this.customerService.listAddresses(
        this.customerId(req),
      );
      res.status(200).json(addresses.map(toAddressResponse));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Save a new address
   */
  addAddress = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const address = await this.customerService.addAddress({
        customerId: this.customerId(req),
        address: {
          ...this.addressData(req.body),
          isDefault: req.body.isDefault,
        },
      });
      res.status(201).json(toAddressResponse(address));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Replace an address
   */
  updateAddress = async (
    req: Request<TAddressParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const address = await this.customerService.updateAddress({
        customerId: this.customerId(req),
        addressId: req.params.addressId,
        address: this.addressData(req.body),
      });
      res.status(200).json(toAddressResponse(address));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove an address
   */
  removeAddress = async (
    req: Request<TAddressParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.customerService.removeAddress(
        this.customerId(req),
        req.params.addressId,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Make an address the default one
   */
  setDefaultAddress = async (
    req: Request<TAddressParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const addresses = await this.customerService.setDefaultAddress(
        this.customerId(req),
        req.params.addressId,
      );
      res.status(200).json(addresses.map(toAddressResponse));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get the router with all routes
   */
  public getRoutes(): Router {
    return this.router;
  }

  // Safe after authenticate + authorize ran for every /me route
  private customerId(req: Request<TAddressParams> | Request): string {
    return req.auth!.subjectId;
  }

  private addressData(body: IParamsAddressData): IParamsAddressData {
    return {
      label: body.label,
      zipCode: body.zipCode,
      street: body.street,
      number: body.number,
      complement: body.complement,
      neighborhood: body.neighborhood,
      city: body.city,
      state: body.state,
      reference: body.reference,
    };
  }
}
