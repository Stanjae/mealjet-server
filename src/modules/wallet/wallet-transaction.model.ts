import { model, Schema } from "mongoose";
import {
  IWalletTransactionDocument,
  WALLET_TRANSACTION_DIRECTIONS,
  WALLET_TRANSACTION_SOURCES,
  WALLET_TRANSACTION_STATUSES,
} from "./wallet-transaction.types";
import { WALLET_OWNER_MODELS } from "./wallet.types";

const walletTransactionSchema = new Schema<IWalletTransactionDocument>(
  {
    wallet: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },
    ownerModel: {
      type: String,
      enum: WALLET_OWNER_MODELS,
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "ownerModel",
      index: true,
    },
    direction: {
      type: String,
      enum: WALLET_TRANSACTION_DIRECTIONS,
      required: true,
    },
    source: {
      type: String,
      enum: WALLET_TRANSACTION_SOURCES,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "NGN",
      uppercase: true,
      trim: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    reference: {
      type: String,
      trim: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: WALLET_TRANSACTION_STATUSES,
      default: "success",
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

walletTransactionSchema.index({ ownerModel: 1, ownerId: 1, createdAt: -1 });
walletTransactionSchema.index(
  { wallet: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $exists: true, $type: "string" } },
  },
);

const WalletTransaction = model<IWalletTransactionDocument>(
  "WalletTransaction",
  walletTransactionSchema,
);

export { walletTransactionSchema, WalletTransaction };
export default WalletTransaction;
