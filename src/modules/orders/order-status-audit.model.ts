import { USER_ROLES } from '@shared/constants/auth.constants';
import { statusHistoryStates } from '@shared/constants/orders.constants';
import { model, Schema } from 'mongoose';

const orderStatusAuditSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      enum: Object.values(statusHistoryStates),
      required: true,
    },
    toStatus: {
      type: String,
      enum: Object.values(statusHistoryStates),
      required: true,
      index: true,
    },
    actorUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorRole: {
      type: String,
      enum: USER_ROLES,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['vendor_update', 'dispatch_accept', 'rider_update', 'vendor_retry'],
      required: true,
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

const OrderStatusAudit = model('OrderStatusAudit', orderStatusAuditSchema);

export default OrderStatusAudit;
