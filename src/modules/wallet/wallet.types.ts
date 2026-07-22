import {
  WALLET_TYPES,
  WALLET_STATUS,
} from "@shared/constants/wallet.constants";
import { Document, Types } from "mongoose";

export const WALLET_OWNER_MODELS = ["User", "Vendor", "Rider"] as const;
export type TWalletOwnerModel = (typeof WALLET_OWNER_MODELS)[number];

export type TWalletType = (typeof WALLET_TYPES)[number];

export type TWalletStatus = (typeof WALLET_STATUS)[number];

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
  dedicatedBankAccount?: Record<string, unknown>;
  status: TWalletStatus;
}

export interface IWalletDocument extends IWallet, Document {
  _id: Types.ObjectId;
}

export type TWalletOwnerInput = {
  ownerModel: TWalletOwnerModel;
  ownerId: Types.ObjectId | string;
  walletType: TWalletType;
  currency?: string;
};

export type TCreateDedicatedPaystackAccountPayload = {
  email: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  preferred_bank: string;
  country: string;
};
