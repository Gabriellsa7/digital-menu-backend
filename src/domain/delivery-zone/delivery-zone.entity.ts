import { normalizeText } from '../common/normalize-text';
import { BusinessRuleError } from '../errors/business-rule.error';
import { IDeliveryZone } from './interfaces/delivery-zone.interface';

export class DeliveryZone implements IDeliveryZone {
  public readonly id: string;
  public readonly storeId: string;
  public readonly neighborhood: string;
  public readonly displayName: string;
  public readonly city: string;
  public readonly cityKey: string;
  public readonly feeInCents: number;
  public readonly etaMinMinutes: number;
  public readonly etaMaxMinutes: number;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: Omit<IDeliveryZone, 'neighborhood' | 'cityKey'>) {
    if (props.etaMinMinutes > props.etaMaxMinutes) {
      throw new BusinessRuleError(
        'Minimum ETA cannot be greater than the maximum ETA',
        'INVALID_ETA',
      );
    }
    if (props.feeInCents < 0) {
      throw new BusinessRuleError(
        'Delivery fee cannot be negative',
        'INVALID_FEE',
      );
    }
    this.id = props.id;
    this.storeId = props.storeId;
    this.displayName = props.displayName.trim();
    this.neighborhood = normalizeText(props.displayName);
    this.city = props.city.trim();
    this.cityKey = normalizeText(props.city);
    this.feeInCents = props.feeInCents;
    this.etaMinMinutes = props.etaMinMinutes;
    this.etaMaxMinutes = props.etaMaxMinutes;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
