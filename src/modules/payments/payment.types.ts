export type TPaymentMenthod = "wallet" | "card" | "bank_transfer" | "ussd";

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
    }
}