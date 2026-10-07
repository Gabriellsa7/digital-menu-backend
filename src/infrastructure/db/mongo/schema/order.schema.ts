import mongoose, { Types } from 'mongoose';
import { ECouponType } from '../../../../domain/coupon/interfaces/coupon.interface';
import { IPostalAddress } from '../../../../domain/common/postal-address.interface';
import {
  EFulfillmentType,
  EOrderActorType,
  EOrderStatus,
  IOrder,
  IOrderItem,
  IOrderItemOption,
  IOrderStatusEntry,
} from '../../../../domain/order/interfaces/order.interface';
import {
  EPaymentMethod,
  EPaymentStatus,
  IPayment,
} from '../../../../domain/payment/interfaces/payment.interface';

export interface IMOrder extends IOrder {
  _id: Types.ObjectId;
}

const { Schema } = mongoose;

const orderItemOptionSchema = new Schema<IOrderItemOption>(
  {
    groupId: { type: String, required: true },
    groupName: { type: String, required: true },
    optionId: { type: String, required: true },
    name: { type: String, required: true },
    priceInCents: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false },
);

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    imageUrl: { type: String },
    unitPriceInCents: { type: Number, required: true },
    quantity: { type: Number, required: true },
    options: { type: [orderItemOptionSchema], default: [] },
    notes: { type: String },
    totalInCents: { type: Number, required: true },
  },
  { _id: false },
);

const deliveryAddressSchema = new Schema<IPostalAddress>(
  {
    zipCode: { type: String, required: true },
    street: { type: String, required: true },
    number: { type: String, required: true },
    complement: { type: String },
    neighborhood: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    reference: { type: String },
  },
  { _id: false },
);

const paymentSchema = new Schema<IPayment>(
  {
    method: { type: String, enum: Object.values(EPaymentMethod), required: true },
    status: { type: String, enum: Object.values(EPaymentStatus), required: true },
    changeForInCents: { type: Number },
    pix: {
      type: new Schema(
        {
          copyPaste: { type: String, required: true },
          qrCodeBase64: { type: String, required: true },
          expiresAt: { type: Date, required: true },
        },
        { _id: false },
      ),
    },
    card: {
      type: new Schema(
        {
          brand: { type: String, required: true },
          last4: { type: String, required: true },
        },
        { _id: false },
      ),
    },
    failedAttempts: { type: Number, required: true, default: 0 },
    transactionId: { type: String },
    paidAt: { type: Date },
  },
  { _id: false },
);

const statusEntrySchema = new Schema<IOrderStatusEntry>(
  {
    status: { type: String, enum: Object.values(EOrderStatus), required: true },
    at: { type: Date, required: true },
    by: {
      type: new Schema(
        {
          type: {
            type: String,
            enum: Object.values(EOrderActorType),
            required: true,
          },
          id: { type: String },
        },
        { _id: false },
      ),
      required: true,
    },
    reason: { type: String },
  },
  { _id: false },
);

export const orderSchema = new Schema<IMOrder>(
  {
    id: { type: String, required: true, unique: true },
    number: { type: Number, required: true, unique: true },
    customerId: { type: String, required: true },
    customerSnapshot: {
      type: new Schema(
        {
          name: { type: String, required: true },
          phone: { type: String, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    items: { type: [orderItemSchema], default: [] },
    fulfillmentType: {
      type: String,
      enum: Object.values(EFulfillmentType),
      required: true,
    },
    deliveryAddress: { type: deliveryAddressSchema },
    deliveryZone: {
      type: new Schema(
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          feeInCents: { type: Number, required: true },
        },
        { _id: false },
      ),
    },
    subtotalInCents: { type: Number, required: true },
    deliveryFeeInCents: { type: Number, required: true },
    discountInCents: { type: Number, required: true },
    totalInCents: { type: Number, required: true },
    coupon: {
      type: new Schema(
        {
          id: { type: String, required: true },
          code: { type: String, required: true },
          type: {
            type: String,
            enum: Object.values(ECouponType),
            required: true,
          },
          value: { type: Number, required: true },
        },
        { _id: false },
      ),
    },
    payment: { type: paymentSchema, required: true },
    status: { type: String, enum: Object.values(EOrderStatus), required: true },
    statusHistory: { type: [statusEntrySchema], default: [] },
    notes: { type: String },
    estimatedReadyAt: { type: Date },
    cancelReason: { type: String },
    idempotencyKey: { type: String },
  },
  { timestamps: true },
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: 1 });
orderSchema.index(
  { customerId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $exists: true } },
  },
);
