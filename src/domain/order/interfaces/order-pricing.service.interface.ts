import { IPostalAddress } from '../../common/postal-address.interface';
import { ICouponService } from '../../coupon/interfaces/coupon.service.interface';
import { ICustomerService } from '../../customer/interfaces/customer.service.interface';
import { IDeliveryZoneService } from '../../delivery-zone/interfaces/delivery-zone.service.interface';
import { IOptionGroupService } from '../../option-group/interfaces/option-group.service.interface';
import { EPaymentMethod } from '../../payment/interfaces/payment.interface';
import { IProductService } from '../../product/interfaces/product.service.interface';
import { IStoreService } from '../../store/interfaces/store.service.interface';
import {
  EFulfillmentType,
  IOrderCouponSnapshot,
  IOrderDeliveryZoneSnapshot,
  IOrderItem,
} from './order.interface';

export interface ICartItemOption {
  groupId: string;
  optionId: string;
  quantity?: number;
}

export interface ICartItem {
  productId: string;
  quantity: number;
  options: ICartItemOption[];
  notes?: string;
}

export interface IParamsQuoteOrder {
  customerId: string;
  items: ICartItem[];
  fulfillmentType: EFulfillmentType;
  addressId?: string;
  couponCode?: string;
  paymentMethod: EPaymentMethod;
  changeForInCents?: number;
}

export interface IOrderQuote {
  items: IOrderItem[];
  fulfillmentType: EFulfillmentType;
  deliveryAddress?: IPostalAddress;
  deliveryZone?: IOrderDeliveryZoneSnapshot;
  subtotalInCents: number;
  deliveryFeeInCents: number;
  discountInCents: number;
  totalInCents: number;
  coupon?: IOrderCouponSnapshot;
  etaMinMinutes: number;
  etaMaxMinutes: number;
}

export interface IParamsOrderPricingService {
  storeService: IStoreService;
  customerService: ICustomerService;
  deliveryZoneService: IDeliveryZoneService;
  productService: IProductService;
  optionGroupService: IOptionGroupService;
  couponService: ICouponService;
}

export interface IOrderPricingService {
  quoteOrder(params: IParamsQuoteOrder): Promise<IOrderQuote>;
}
