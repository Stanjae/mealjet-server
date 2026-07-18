import { model, Schema } from "mongoose";
import { IWalletDocument, WALLET_OWNER_MODELS } from "./wallet.types";
import { WALLET_TYPES } from "@shared/constants/wallet.constants";

const walletSchema = new Schema<IWalletDocument>(
  {
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
    walletType: {
      type: String,
      enum: WALLET_TYPES,
      required: true,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    pendingBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "NGN",
      uppercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

walletSchema.index(
  { ownerModel: 1, ownerId: 1, walletType: 1 },
  { unique: true },
);

walletSchema.pre("validate", function () {
  if (this.ownerModel === "User" && this.walletType !== "customer_spend") {
    throw new Error("Users can only have a customer_spend wallet");
  }

  if (this.ownerModel === "Vendor" && this.walletType !== "vendor_earnings") {
    throw new Error("Vendors can only have a vendor_earnings wallet");
  }

  if (this.ownerModel === "Rider" && this.walletType !== "rider_earnings") {
    throw new Error("Riders can only have a rider_earnings wallet");
  }
});

const Wallet = model<IWalletDocument>("Wallet", walletSchema);

export { walletSchema, Wallet };
export default Wallet;
