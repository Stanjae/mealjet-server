export type TPaymentMenthod = "wallet" | "card" | "bank_transfer" | "ussd";

export type TInitializePaymentPayload = {
    checkoutSessionId: string;
    paymentMethod: TPaymentMenthod;
}