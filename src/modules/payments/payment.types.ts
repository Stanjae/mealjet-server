export type TPaymentMenthod = "wallet" | "card" | "bank_transfer" | "ussd";

export type TInitializePaymentPayload = {
    checkoutSessionId: string;
    paymentMethod: TPaymentMenthod;
    accessCode?: string;
};

export type THandlePaymentSuccessDataPayload = {
    reference: string;
    amount: number;
    metadata: {
        customerId: string;
        checkoutSessionId: string;
    }
}