import { IUserDocument } from "@modules/users";

export type TPaymentMenthod = "wallet" | "card" | "paystack" | "ussd";

export type TInitializePaymentPayload = {
  checkoutSessionId: string;
  paymentMethod: TPaymentMenthod;
  accessCode?: string;
  noteForRider?: string;
  noteForVendor?: string;
};

export type THandlePaymentSuccessDataPayload = {
  reference: string;
  amount: number;
  metadata: {
    customerId: string;
    checkoutSessionId: string;
    paymentMethod: TPaymentMenthod;
    noteForRider?: string;
    noteForVendor?: string;
  };
};

export type TInitializePaymentProviderPayload = {
  customer: IUserDocument;
  grandTotal: number;
  checkoutSessionId: string;
  noteForRider?: string;
  noteForVendor?: string;
  paymentMethod: TPaymentMenthod;
};
