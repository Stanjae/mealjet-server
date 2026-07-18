import { AppError } from "@shared/middleware/error.middleware";
import { Types } from "mongoose";
import Wallet from "./wallet.model";
import WalletTransaction from "./wallet-transaction.model";
import {
  TWalletTransactionSource,
  type IWalletTransactionDocument,
} from "./wallet-transaction.types";
import {
  TWalletType,
  TWalletOwnerModel,
  type IWalletDocument,
} from "./wallet.types";

type TWalletOwnerInput = {
  ownerModel: TWalletOwnerModel;
  ownerId: Types.ObjectId | string;
  walletType: TWalletType;
  currency?: string;
};

type TBaseWalletOperationInput = TWalletOwnerInput & {
  amount: number;
  source: TWalletTransactionSource;
  reference?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

type TWalletOperationResult = {
  wallet: IWalletDocument;
  transaction: IWalletTransactionDocument;
  idempotentReplay: boolean;
};

class WalletService {
  private normalizeOwnerId(ownerId: Types.ObjectId | string) {
    return ownerId instanceof Types.ObjectId ? ownerId : new Types.ObjectId(ownerId);
  }

  async getOrCreateWallet({
    ownerModel,
    ownerId,
    walletType,
    currency = "NGN",
  }: TWalletOwnerInput) {
    const normalizedOwnerId = this.normalizeOwnerId(ownerId);

    return Wallet.findOneAndUpdate(
      {
        ownerModel,
        ownerId: normalizedOwnerId,
        walletType,
      },
      {
        $setOnInsert: {
          ownerModel,
          ownerId: normalizedOwnerId,
          walletType,
          currency,
          balance: 0,
          pendingBalance: 0,
          isActive: true,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );
  }

  private async findExistingIdempotentTransaction(
    walletId: Types.ObjectId,
    idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      return null;
    }

    return WalletTransaction.findOne({
      wallet: walletId,
      idempotencyKey,
      status: "success",
    });
  }

  async credit(input: TBaseWalletOperationInput): Promise<TWalletOperationResult> {
    if (input.amount <= 0) {
      throw new AppError(400, "Credit amount must be greater than zero");
    }

    const wallet = await this.getOrCreateWallet(input);

    const existingTx = await this.findExistingIdempotentTransaction(
      wallet._id as Types.ObjectId,
      input.idempotencyKey,
    );

    if (existingTx) {
      return {
        wallet,
        transaction: existingTx,
        idempotentReplay: true,
      };
    }

    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
        isActive: true,
      },
      {
        $inc: { balance: input.amount },
      },
      { new: true },
    );

    if (!updatedWallet) {
      throw new AppError(400, "Wallet is not active");
    }

    const balanceAfter = updatedWallet.balance;
    const balanceBefore = balanceAfter - input.amount;

    const transaction = await WalletTransaction.create({
      wallet: updatedWallet._id,
      ownerModel: updatedWallet.ownerModel,
      ownerId: updatedWallet.ownerId,
      direction: "credit",
      source: input.source,
      amount: input.amount,
      currency: updatedWallet.currency,
      balanceBefore,
      balanceAfter,
      reference: input.reference,
      idempotencyKey: input.idempotencyKey,
      status: "success",
      metadata: input.metadata || {},
    });

    return {
      wallet: updatedWallet,
      transaction,
      idempotentReplay: false,
    };
  }

  async debit(input: TBaseWalletOperationInput): Promise<TWalletOperationResult> {
    if (input.amount <= 0) {
      throw new AppError(400, "Debit amount must be greater than zero");
    }

    const wallet = await this.getOrCreateWallet(input);

    const existingTx = await this.findExistingIdempotentTransaction(
      wallet._id as Types.ObjectId,
      input.idempotencyKey,
    );

    if (existingTx) {
      return {
        wallet,
        transaction: existingTx,
        idempotentReplay: true,
      };
    }

    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
        isActive: true,
        balance: { $gte: input.amount },
      },
      {
        $inc: { balance: -input.amount },
      },
      { new: true },
    );

    if (!updatedWallet) {
      throw new AppError(400, "Insufficient wallet balance or wallet is inactive");
    }

    const balanceAfter = updatedWallet.balance;
    const balanceBefore = balanceAfter + input.amount;

    const transaction = await WalletTransaction.create({
      wallet: updatedWallet._id,
      ownerModel: updatedWallet.ownerModel,
      ownerId: updatedWallet.ownerId,
      direction: "debit",
      source: input.source,
      amount: input.amount,
      currency: updatedWallet.currency,
      balanceBefore,
      balanceAfter,
      reference: input.reference,
      idempotencyKey: input.idempotencyKey,
      status: "success",
      metadata: input.metadata || {},
    });

    return {
      wallet: updatedWallet,
      transaction,
      idempotentReplay: false,
    };
  }
}

export const walletService = new WalletService();
export default walletService;
