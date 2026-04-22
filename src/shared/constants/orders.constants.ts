export const statusHistoryStates = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "assigned",
  "picked_up",
  "on_the_way",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export const orderTypes = ["delivery", "pickup"] as const;

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

export const PAYMENT_METHODS = ["wallet", "card", "paystack", "ussd"] as const;