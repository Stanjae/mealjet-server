import { Document, Types } from "mongoose";
import { TWalletOwnerModel } from "./wallet.types";

export const WALLET_TRANSACTION_DIRECTIONS = ["credit", "debit"] as const;
export type TWalletTransactionDirection =
  (typeof WALLET_TRANSACTION_DIRECTIONS)[number];

export const WALLET_TRANSACTION_SOURCES = [
  "wallet_topup",
  "order_payment",
  "order_earning",
  "refund",
  "payout",
  "adjustment",
] as const;
export type TWalletTransactionSource =
  (typeof WALLET_TRANSACTION_SOURCES)[number];

export const WALLET_TRANSACTION_STATUSES = [
  "pending",
  "success",
  "failed",
] as const;
export type TWalletTransactionStatus =
  (typeof WALLET_TRANSACTION_STATUSES)[number];

export interface IWalletTransaction {
  wallet: Types.ObjectId;
  ownerModel: TWalletOwnerModel;
  ownerId: Types.ObjectId;
  direction: TWalletTransactionDirection;
  source: TWalletTransactionSource;
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  reference?: string;
  idempotencyKey?: string;
  status: TWalletTransactionStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletTransactionDocument
  extends IWalletTransaction,
    Document {
  _id: Types.ObjectId;
}
