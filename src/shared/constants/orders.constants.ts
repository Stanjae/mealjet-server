export enum statusHistoryStates {
  pending = 'pending',
  confirmed = 'confirmed',
  preparing = 'preparing',
  ready = 'ready',
  assigned = 'assigned',
  picked_up = 'picked_up',
  on_the_way = 'on_the_way',
  delivered = 'delivered',
  cancelled = 'cancelled',
  refunded = 'refunded',
}
export const orderTypes = ["delivery", "pickup"] as const;

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

export const REFUND_STATUSES = ["none", "pending", "success", "failed"] as const;

export const PAYMENT_METHODS = ["wallet", "card", "paystack", "ussd"] as const;