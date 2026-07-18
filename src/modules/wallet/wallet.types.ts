
import { WALLET_TYPES } from "@shared/constants/wallet.constants";
import { Document, Types } from "mongoose";

export const WALLET_OWNER_MODELS = ["User", "Vendor", "Rider"] as const;
export type TWalletOwnerModel = (typeof WALLET_OWNER_MODELS)[number];

export type TWalletType = (typeof WALLET_TYPES)[number];

export interface IWallet {
  ownerModel: TWalletOwnerModel;
  ownerId: Types.ObjectId;
  walletType: TWalletType;
  balance: number;
  pendingBalance: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletDocument extends IWallet, Document {
  _id: Types.ObjectId;
}