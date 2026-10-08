import '../types/express-request';
import { Router, Request, Response, NextFunction } from 'express';
import { IController } from './controller.interface';
import { ITokenService } from '../../../domain/auth/interfaces/token.service.interface';
import { IStaffUserService } from '../../../domain/staff-user/interfaces/staff-user.service.interface';
import { createAuthGuards } from '../middlewares/auth-guards';
import { toStaffUserResponse } from '../presenters/staff-user.presenter';

type TIdParams = { id: string };

export interface IParamsStaffUserController {
  staffUserService: IStaffUserService;
  tokenService: ITokenService;
}

export class StaffUserController implements IController {
  router: Router;
  private readonly staffUserService: IStaffUserService;
  private readonly tokenService: ITokenService;

  constructor({ staffUserService, tokenService }: IParamsStaffUserController) {
    this.staffUserService = staffUserService;
    this.tokenService = tokenService;
    this.router = Router();
    this.initRoutes();
  }

  initRoutes() {
    const { staff, owner } = createAuthGuards(this.tokenService);
    this.router.get('/admin/me', ...staff, this.getMe);
    this.router.patch('/admin/me/password', ...staff, this.changePassword);
    this.router.get('/admin/staff-users', ...owner, this.list);
    this.router.post('/admin/staff-users', ...owner, this.create);
    this.router.put('/admin/staff-users/:id', ...owner, this.update);
    this.router.patch('/admin/staff-users/:id/active', ...owner, this.setActive);
  }

  getMe = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const staffUser = await this.staffUserService.getStaffUserById(
        req.auth!.subjectId,
      );
      res.status(200).json(toStaffUserResponse(staffUser));
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.staffUserService.changeStaffUserPassword({
        id: req.auth!.subjectId,
        currentPassword: req.body.currentPassword,
        newPassword: req.body.newPassword,
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  list = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const staffUsers = await this.staffUserService.listStaffUsers();
      res.status(200).json(staffUsers.map(toStaffUserResponse));
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
      const { name, email, password, role } = req.body;
      const staffUser = await this.staffUserService.createStaffUser({
        name,
        email,
        password,
        role,
      });
      res.status(201).json(toStaffUserResponse(staffUser));
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
      const staffUser = await this.staffUserService.updateStaffUser({
        id: req.params.id,
        name: req.body.name,
        role: req.body.role,
      });
      res.status(200).json(toStaffUserResponse(staffUser));
    } catch (error) {
      next(error);
    }
  };

  setActive = async (
    req: Request<TIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const staffUser = await this.staffUserService.setStaffUserActive({
        id: req.params.id,
        isActive: req.body.isActive,
      });
      res.status(200).json(toStaffUserResponse(staffUser));
    } catch (error) {
      next(error);
    }
  };

  public getRoutes(): Router {
    return this.router;
  }
}
