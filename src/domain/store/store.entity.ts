import { BusinessRuleError } from '../errors/business-rule.error';
import { IPostalAddress } from '../common/postal-address.interface';
import {
  currentIntervalEnd,
  nextOpeningAt,
} from './policies/opening-hours.policy';
import {
  EManualStatus,
  IOpeningHour,
  IStore,
  IStoreStatus,
} from './interfaces/store.interface';

export const DEFAULT_STORE_TIMEZONE = 'America/Sao_Paulo';

export class Store implements IStore {
  public readonly id: string;
  public readonly name: string;
  public readonly slug: string;
  public readonly description: string;
  public readonly phone: string;
  public readonly logoUrl?: string;
  public readonly logoPublicId?: string;
  public readonly bannerUrl?: string;
  public readonly bannerPublicId?: string;
  public readonly address: IPostalAddress;
  public readonly timezone: string;
  public readonly openingHours: IOpeningHour[];
  public readonly manualStatus: EManualStatus;
  public readonly manualStatusUntil?: Date;
  public readonly minimumOrderInCents: number;
  public readonly deliveryEnabled: boolean;
  public readonly pickupEnabled: boolean;
  public readonly pickupEtaMinutes: number;
  public readonly isPublished: boolean;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: IStore) {
    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
    this.description = props.description;
    this.phone = props.phone;
    this.logoUrl = props.logoUrl;
    this.logoPublicId = props.logoPublicId;
    this.bannerUrl = props.bannerUrl;
    this.bannerPublicId = props.bannerPublicId;
    this.address = props.address;
    this.timezone = props.timezone;
    this.openingHours = props.openingHours;
    this.manualStatus = props.manualStatus;
    this.manualStatusUntil = props.manualStatusUntil;
    this.minimumOrderInCents = props.minimumOrderInCents;
    this.deliveryEnabled = props.deliveryEnabled;
    this.pickupEnabled = props.pickupEnabled;
    this.pickupEtaMinutes = props.pickupEtaMinutes;
    this.isPublished = props.isPublished;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static withDefaults(
    id: string,
    now: Date,
    { name, slug }: Pick<IStore, 'name' | 'slug'>,
  ): Store {
    return new Store({
      id,
      name,
      slug,
      description: '',
      phone: '',
      address: {
        zipCode: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
      },
      timezone: DEFAULT_STORE_TIMEZONE,
      openingHours: [],
      manualStatus: EManualStatus.AUTO,
      minimumOrderInCents: 0,
      deliveryEnabled: false,
      pickupEnabled: true,
      pickupEtaMinutes: 20,
      isPublished: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  effectiveManualStatus(now: Date): EManualStatus {
    const isExpired =
      this.manualStatusUntil !== undefined &&
      this.manualStatusUntil.getTime() <= now.getTime();
    return isExpired ? EManualStatus.AUTO : this.manualStatus;
  }

  statusAt(now: Date): IStoreStatus {
    const manualStatus = this.effectiveManualStatus(now);
    const scheduleEnd = currentIntervalEnd(
      this.openingHours,
      this.timezone,
      now,
    );
    const isOpenNow =
      manualStatus === EManualStatus.FORCED_OPEN ||
      (manualStatus === EManualStatus.AUTO && scheduleEnd !== undefined);

    if (isOpenNow) {
      const closesAt =
        manualStatus === EManualStatus.FORCED_OPEN
          ? this.manualStatusUntil
          : scheduleEnd;
      return { isOpenNow, manualStatus, ...(closesAt && { closesAt }) };
    }
    const nextOpening = nextOpeningAt(this.openingHours, this.timezone, now);
    return {
      isOpenNow,
      manualStatus,
      ...(nextOpening && { nextOpeningAt: nextOpening }),
    };
  }

  static assertFulfillmentEnabled(
    deliveryEnabled: boolean,
    pickupEnabled: boolean,
  ): void {
    if (!deliveryEnabled && !pickupEnabled) {
      throw new BusinessRuleError(
        'At least one of delivery or pickup must be enabled',
        'NO_FULFILLMENT_ENABLED',
      );
    }
  }
}
