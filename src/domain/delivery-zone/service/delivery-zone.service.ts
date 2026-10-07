import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { randomUUID } from 'crypto';
import { IClock } from '../../common/clock.interface';
import { normalizeText } from '../../common/normalize-text';
import { ConflictError } from '../../errors/conflict.error';
import { NotFoundError } from '../../errors/not-found.error';
import { DeliveryZone } from '../delivery-zone.entity';
import { IDeliveryZone } from '../interfaces/delivery-zone.interface';
import {
  IDeliveryZoneService,
  IParamsDeliveryZoneData,
  IParamsDeliveryZoneService,
  IParamsUpdateDeliveryZone,
} from '../interfaces/delivery-zone.service.interface';
import { IDeliveryZoneRepositoryRead } from '../repository/delivery-zone.repository.read';
import { IDeliveryZoneRepositoryWrite } from '../repository/delivery-zone.repository.write';

export class DeliveryZoneService implements IDeliveryZoneService {
  private deliveryZoneRepositoryRead: IDeliveryZoneRepositoryRead;
  private deliveryZoneRepositoryWrite: IDeliveryZoneRepositoryWrite;
  private clock: IClock;

  constructor({
    deliveryZoneRepositoryRead,
    deliveryZoneRepositoryWrite,
    clock,
  }: IParamsDeliveryZoneService) {
    this.deliveryZoneRepositoryRead = deliveryZoneRepositoryRead;
    this.deliveryZoneRepositoryWrite = deliveryZoneRepositoryWrite;
    this.clock = clock;
  }

  @ErrorHandler()
  async listDeliveryZones(activeOnly: boolean): Promise<IDeliveryZone[]> {
    return this.deliveryZoneRepositoryRead.listDeliveryZones(
      activeOnly ? { isActive: true } : {},
    );
  }

  @ErrorHandler()
  async getDeliveryZoneById(id: string): Promise<IDeliveryZone> {
    const deliveryZone =
      await this.deliveryZoneRepositoryRead.findDeliveryZoneById(id);

    return deliveryZone ? deliveryZone : this.throwDeliveryZoneNotFound();
  }

  @ErrorHandler()
  async createDeliveryZone(
    params: IParamsDeliveryZoneData,
  ): Promise<IDeliveryZone> {
    const now = this.clock.now();
    const deliveryZone = new DeliveryZone({
      ...params,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
    await this.assertUniqueNeighborhood(deliveryZone);

    return this.deliveryZoneRepositoryWrite.createDeliveryZone(deliveryZone);
  }

  @ErrorHandler()
  async updateDeliveryZone({
    id,
    ...changes
  }: IParamsUpdateDeliveryZone): Promise<IDeliveryZone> {
    const current = await this.getDeliveryZoneById(id);
    const defined = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    const deliveryZone = new DeliveryZone({ ...current, ...defined });
    await this.assertUniqueNeighborhood(deliveryZone);

    const { createdAt, updatedAt, ...fields } = deliveryZone;
    const updated =
      await this.deliveryZoneRepositoryWrite.updateDeliveryZoneById(
        id,
        fields,
      );
    return updated ? updated : this.throwDeliveryZoneNotFound();
  }

  @ErrorHandler()
  async deleteDeliveryZone(id: string): Promise<void> {
    const deleted =
      await this.deliveryZoneRepositoryWrite.deleteDeliveryZoneById(id);
    if (!deleted) {
      this.throwDeliveryZoneNotFound();
    }
  }

  @ErrorHandler()
  async resolveDeliveryZone(
    neighborhood: string,
    city: string,
  ): Promise<IDeliveryZone> {
    const deliveryZone = await this.findActiveZone(neighborhood, city);

    return deliveryZone ? deliveryZone : this.throwDeliveryZoneNotFound();
  }

  @ErrorHandler()
  async resolveDeliveryZoneId(
    neighborhood: string,
    city: string,
  ): Promise<string | undefined> {
    const deliveryZone = await this.findActiveZone(neighborhood, city);
    return deliveryZone?.id;
  }

  private async findActiveZone(
    neighborhood: string,
    city: string,
  ): Promise<IDeliveryZone | null> {
    const deliveryZone =
      await this.deliveryZoneRepositoryRead.findDeliveryZoneByKeys(
        normalizeText(neighborhood),
        normalizeText(city),
      );
    return deliveryZone?.isActive ? deliveryZone : null;
  }

  private async assertUniqueNeighborhood(
    deliveryZone: IDeliveryZone,
  ): Promise<void> {
    const existing =
      await this.deliveryZoneRepositoryRead.findDeliveryZoneByKeys(
        deliveryZone.neighborhood,
        deliveryZone.cityKey,
      );
    if (existing && existing.id !== deliveryZone.id) {
      throw new ConflictError(
        'A delivery zone for this neighborhood already exists',
        'DELIVERY_ZONE_EXISTS',
      );
    }
  }

  private throwDeliveryZoneNotFound(): never {
    throw new NotFoundError('Delivery zone not found');
  }
}
