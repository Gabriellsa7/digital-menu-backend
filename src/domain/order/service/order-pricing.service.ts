import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { ICouponService } from '../../coupon/interfaces/coupon.service.interface';
import { Customer } from '../../customer/customer.entity';
import { ICustomerService } from '../../customer/interfaces/customer.service.interface';
import { IDeliveryZone } from '../../delivery-zone/interfaces/delivery-zone.interface';
import { IDeliveryZoneService } from '../../delivery-zone/interfaces/delivery-zone.service.interface';
import { BusinessRuleError } from '../../errors/business-rule.error';
import { NotFoundError } from '../../errors/not-found.error';
import { IOptionGroupService } from '../../option-group/interfaces/option-group.service.interface';
import { EPaymentMethod } from '../../payment/interfaces/payment.interface';
import { IProductService } from '../../product/interfaces/product.service.interface';
import { IStore } from '../../store/interfaces/store.interface';
import { IStoreService } from '../../store/interfaces/store.service.interface';
import {
  IOrderPricingService,
  IOrderQuote,
  IParamsOrderPricingService,
  IParamsQuoteOrder,
} from '../interfaces/order-pricing.service.interface';
import { EFulfillmentType, IOrderItem } from '../interfaces/order.interface';
import { assertCartSize, buildOrderItems } from '../order-snapshot.factory';

interface IDeliveryDetails {
  deliveryAddress?: IOrderQuote['deliveryAddress'];
  deliveryZone?: IDeliveryZone;
}

export class OrderPricingService implements IOrderPricingService {
  private storeService: IStoreService;
  private customerService: ICustomerService;
  private deliveryZoneService: IDeliveryZoneService;
  private productService: IProductService;
  private optionGroupService: IOptionGroupService;
  private couponService: ICouponService;

  constructor({
    storeService,
    customerService,
    deliveryZoneService,
    productService,
    optionGroupService,
    couponService,
  }: IParamsOrderPricingService) {
    this.storeService = storeService;
    this.customerService = customerService;
    this.deliveryZoneService = deliveryZoneService;
    this.productService = productService;
    this.optionGroupService = optionGroupService;
    this.couponService = couponService;
  }

  @ErrorHandler()
  async quoteOrder(params: IParamsQuoteOrder): Promise<IOrderQuote> {
    const store = await this.storeService.assertAcceptingOrders(
      params.storeId,
    );
    this.assertFulfillmentEnabled(store, params.fulfillmentType);
    assertCartSize(params.items);
    const { deliveryAddress, deliveryZone } =
      await this.resolveDelivery(params);

    const items = await this.buildItems(params);
    const subtotalInCents = items.reduce(
      (total, { totalInCents }) => total + totalInCents,
      0,
    );
    if (
      params.fulfillmentType === EFulfillmentType.DELIVERY &&
      subtotalInCents < store.minimumOrderInCents
    ) {
      throw new BusinessRuleError(
        'Order subtotal is below the minimum for delivery',
        'BELOW_MINIMUM_ORDER',
        { minimumOrderInCents: store.minimumOrderInCents },
      );
    }

    const deliveryFeeInCents = deliveryZone?.feeInCents ?? 0;
    const couponDiscount = params.couponCode
      ? await this.couponService.validateCouponForCustomer({
          code: params.couponCode,
          customerId: params.customerId,
          subtotalInCents,
          deliveryFeeInCents,
          fulfillmentType: params.fulfillmentType,
        })
      : undefined;
    const discountInCents = couponDiscount?.discountInCents ?? 0;
    const totalInCents = Math.max(
      0,
      subtotalInCents + deliveryFeeInCents - discountInCents,
    );
    this.assertValidChange(params, totalInCents);

    return {
      items,
      fulfillmentType: params.fulfillmentType,
      ...(deliveryAddress && { deliveryAddress }),
      ...(deliveryZone && {
        deliveryZone: {
          id: deliveryZone.id,
          name: deliveryZone.displayName,
          feeInCents: deliveryZone.feeInCents,
        },
      }),
      subtotalInCents,
      deliveryFeeInCents,
      discountInCents,
      totalInCents,
      ...(couponDiscount && {
        coupon: {
          id: couponDiscount.coupon.id,
          code: couponDiscount.coupon.code,
          type: couponDiscount.coupon.type,
          value: couponDiscount.coupon.value,
        },
      }),
      etaMinMinutes: deliveryZone?.etaMinMinutes ?? store.pickupEtaMinutes,
      etaMaxMinutes: deliveryZone?.etaMaxMinutes ?? store.pickupEtaMinutes,
    };
  }

  private assertFulfillmentEnabled(
    store: IStore,
    fulfillmentType: EFulfillmentType,
  ): void {
    const isEnabled =
      fulfillmentType === EFulfillmentType.DELIVERY
        ? store.deliveryEnabled
        : store.pickupEnabled;
    if (!isEnabled) {
      throw new BusinessRuleError(
        `${fulfillmentType} is not available right now`,
        'FULFILLMENT_UNAVAILABLE',
        { fulfillmentType },
      );
    }
  }

  private async resolveDelivery({
    customerId,
    fulfillmentType,
    addressId,
  }: IParamsQuoteOrder): Promise<IDeliveryDetails> {
    if (fulfillmentType !== EFulfillmentType.DELIVERY) {
      return {};
    }
    if (!addressId) {
      throw new BusinessRuleError(
        'Delivery orders need an address',
        'ADDRESS_REQUIRED',
      );
    }
    const customer = new Customer(
      await this.customerService.getCustomerById(customerId),
    );
    const { id, label, deliveryZoneId, isDefault, ...deliveryAddress } =
      customer.findAddress(addressId);
    const deliveryZone = deliveryZoneId
      ? await this.findActiveZone(deliveryZoneId)
      : undefined;
    if (!deliveryZone) {
      throw new BusinessRuleError(
        'The store does not deliver to this address',
        'ADDRESS_NOT_SERVED',
        { addressId },
      );
    }
    return { deliveryAddress, deliveryZone };
  }

  private async findActiveZone(
    deliveryZoneId: string,
  ): Promise<IDeliveryZone | undefined> {
    const deliveryZone = await this.deliveryZoneService
      .getDeliveryZoneById(deliveryZoneId)
      .catch((error) => {
        if (error instanceof NotFoundError) {
          return undefined;
        }
        throw error;
      });
    return deliveryZone?.isActive ? deliveryZone : undefined;
  }

  private async buildItems({
    storeId,
    items,
  }: IParamsQuoteOrder): Promise<IOrderItem[]> {
    const productIds = [...new Set(items.map(({ productId }) => productId))];
    const products = await this.productService.findProductsByIds(
      storeId,
      productIds,
    );
    const groupIds = [...new Set(products.flatMap((p) => p.optionGroupIds))];
    const optionGroups =
      await this.optionGroupService.findOptionGroupsByIds(groupIds);
    return buildOrderItems(items, products, optionGroups);
  }

  private assertValidChange(
    { paymentMethod, changeForInCents }: IParamsQuoteOrder,
    totalInCents: number,
  ): void {
    if (changeForInCents === undefined) {
      return;
    }
    if (
      paymentMethod !== EPaymentMethod.CASH_ON_DELIVERY ||
      changeForInCents <= totalInCents
    ) {
      throw new BusinessRuleError(
        'Change is only for cash payments above the total',
        'INVALID_CHANGE',
        { totalInCents },
      );
    }
  }
}
