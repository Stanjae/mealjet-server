import { AppError } from "@shared/middleware/error.middleware";
import { startSession, Types } from "mongoose";
import Wallet from "./wallet.model";
import WalletTransaction from "./wallet-transaction.model";
import {
  TWalletTransactionSource,
  type IWalletTransactionDocument,
} from "./wallet-transaction.types";
import {
  type IWalletDocument,
  TWalletOwnerInput,
  TCreateDedicatedPaystackAccountPayload,
} from "./wallet.types";
import { env } from "@shared/config/env";
import { IUserDocument } from "@modules/users/user.model";

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

type TWalletTransferInput = {
  from: TWalletOwnerInput;
  to: TWalletOwnerInput;
  amount: number;
  reference?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

type TWalletTransferResult = {
  fromWallet: IWalletDocument;
  toWallet: IWalletDocument;
  debitTransaction: IWalletTransactionDocument;
  creditTransaction: IWalletTransactionDocument;
  idempotentReplay: boolean;
};

class WalletService {
  private normalizeOwnerId(ownerId: Types.ObjectId | string) {
    return ownerId instanceof Types.ObjectId
      ? ownerId
      : new Types.ObjectId(ownerId);
  }

  private async createDedicatedPaystackAccount(
    data: TCreateDedicatedPaystackAccountPayload,
  ) {
    const res = await fetch(
      `${env.PAYSTACK_API_URL}/dedicated_account/assign`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
    return res.json();
  }

  async createWallet(
    { userId: ownerId }: { userId: string },
    user: IUserDocument,
  ) {
    const normalizedOwnerId = this.normalizeOwnerId(ownerId);
    if (user._id.toString() !== normalizedOwnerId.toString()) {
      throw new AppError(
        403,
        "You are not authorized to create a wallet for this user",
      );
    }
    const buildPayload: TWalletOwnerInput = {
      ownerModel:
        user.role === "customer"
          ? "User"
          : user.role === "vendor"
            ? "Vendor"
            : "Rider",
      ownerId: normalizedOwnerId,
      walletType:
        user.role === "customer"
          ? "customer_spend"
          : user.role === "vendor"
            ? "vendor_earnings"
            : "rider_earnings",
      currency: "NGN",
    };
    const existingWallet = await Wallet.findOne(buildPayload);
    if (existingWallet) {
      return {
        status: existingWallet.status,
        message:
          existingWallet.status === "active"
            ? "Wallet already exists and is active"
            : existingWallet.status === "pending"
              ? "Wallet creation is in progress"
              : "Wallet already exists but is inactive",
      };
    }

    const response = await this.createDedicatedPaystackAccount({
      country: "NG",
      email: user.email,
      first_name: user.firstName || "",
      middle_name: "",
      last_name: user.lastName || "",
      phone: user.phone || "",
      preferred_bank: "test-bank",
    });

    console.log("Paystack dedicated account response:", response);
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

  /* async credit(
    input: TBaseWalletOperationInput,
  ): Promise<TWalletOperationResult> {
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
  } */

  /* async debit(
    input: TBaseWalletOperationInput,
  ): Promise<TWalletOperationResult> {
    if (input.amount <= 0) {
      throw new AppError(400, "Debit amount must be greater than zero");
    }

    const wallet = await this.createWallet(input);

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
      throw new AppError(
        400,
        "Insufficient wallet balance or wallet is inactive",
      );
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
  } */

  async transfer(input: TWalletTransferInput): Promise<TWalletTransferResult> {
    if (input.amount <= 0) {
      throw new AppError(400, "Transfer amount must be greater than zero");
    }

    const fromOwnerId = this.normalizeOwnerId(input.from.ownerId);
    const toOwnerId = this.normalizeOwnerId(input.to.ownerId);

    if (
      input.from.ownerModel === input.to.ownerModel &&
      fromOwnerId.equals(toOwnerId) &&
      input.from.walletType === input.to.walletType
    ) {
      throw new AppError(
        400,
        "Source and destination wallet cannot be the same",
      );
    }

    const session = await startSession();

    let transferResult: TWalletTransferResult | null = null;

    try {
      await session.withTransaction(async () => {
        const sourceWallet = await Wallet.findOne({
          ownerModel: input.from.ownerModel,
          ownerId: fromOwnerId,
          walletType: input.from.walletType,
          isActive: true,
        }).session(session);

        if (!sourceWallet) {
          throw new AppError(404, "Source wallet not found or inactive");
        }

        if (input.idempotencyKey) {
          const existingDebitTx = await WalletTransaction.findOne({
            wallet: sourceWallet._id,
            idempotencyKey: input.idempotencyKey,
            direction: "debit",
            status: "success",
          }).session(session);

          if (existingDebitTx) {
            const destinationWallet = await Wallet.findOne({
              ownerModel: input.to.ownerModel,
              ownerId: toOwnerId,
              walletType: input.to.walletType,
            }).session(session);

            const existingCreditTx = destinationWallet
              ? await WalletTransaction.findOne({
                  wallet: destinationWallet._id,
                  idempotencyKey: input.idempotencyKey,
                  direction: "credit",
                  status: "success",
                }).session(session)
              : null;

            if (!destinationWallet || !existingCreditTx) {
              throw new AppError(
                409,
                "Transfer idempotency state is inconsistent",
              );
            }

            transferResult = {
              fromWallet: sourceWallet,
              toWallet: destinationWallet,
              debitTransaction: existingDebitTx,
              creditTransaction: existingCreditTx,
              idempotentReplay: true,
            };
            return;
          }
        }

        const destinationWallet = await Wallet.findOneAndUpdate(
          {
            ownerModel: input.to.ownerModel,
            ownerId: toOwnerId,
            walletType: input.to.walletType,
          },
          {
            $setOnInsert: {
              ownerModel: input.to.ownerModel,
              ownerId: toOwnerId,
              walletType: input.to.walletType,
              currency: input.to.currency || sourceWallet.currency,
              balance: 0,
              pendingBalance: 0,
              isActive: true,
            },
          },
          {
            new: true,
            upsert: true,
            session,
          },
        );

        if (!destinationWallet || !destinationWallet.isActive) {
          throw new AppError(400, "Destination wallet is not active");
        }

        const debitedWallet = await Wallet.findOneAndUpdate(
          {
            _id: sourceWallet._id,
            balance: { $gte: input.amount },
            isActive: true,
          },
          {
            $inc: { balance: -input.amount },
          },
          {
            new: true,
            session,
          },
        );

        if (!debitedWallet) {
          throw new AppError(400, "Insufficient source wallet balance");
        }

        const creditedWallet = await Wallet.findOneAndUpdate(
          {
            _id: destinationWallet._id,
            isActive: true,
          },
          {
            $inc: { balance: input.amount },
          },
          {
            new: true,
            session,
          },
        );

        if (!creditedWallet) {
          throw new AppError(400, "Destination wallet is not active");
        }

        const [debitTransaction] = await WalletTransaction.create(
          [
            {
              wallet: debitedWallet._id,
              ownerModel: debitedWallet.ownerModel,
              ownerId: debitedWallet.ownerId,
              direction: "debit",
              source: "adjustment",
              amount: input.amount,
              currency: debitedWallet.currency,
              balanceBefore: debitedWallet.balance + input.amount,
              balanceAfter: debitedWallet.balance,
              reference: input.reference,
              idempotencyKey: input.idempotencyKey,
              status: "success",
              metadata: input.metadata || {},
            },
          ],
          { session },
        );

        const [creditTransaction] = await WalletTransaction.create(
          [
            {
              wallet: creditedWallet._id,
              ownerModel: creditedWallet.ownerModel,
              ownerId: creditedWallet.ownerId,
              direction: "credit",
              source: "adjustment",
              amount: input.amount,
              currency: creditedWallet.currency,
              balanceBefore: creditedWallet.balance - input.amount,
              balanceAfter: creditedWallet.balance,
              reference: input.reference,
              idempotencyKey: input.idempotencyKey,
              status: "success",
              metadata: input.metadata || {},
            },
          ],
          { session },
        );

        transferResult = {
          fromWallet: debitedWallet,
          toWallet: creditedWallet,
          debitTransaction,
          creditTransaction,
          idempotentReplay: false,
        };
      });

      if (!transferResult) {
        throw new AppError(500, "Transfer failed to produce a result");
      }

      return transferResult;
    } finally {
      await session.endSession();
    }
  }
}

export const walletService = new WalletService();
export default walletService;
