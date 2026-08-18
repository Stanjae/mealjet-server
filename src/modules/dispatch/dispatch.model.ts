import { DispatchStatus } from "@shared/types/enums";
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;
import {
  IDispatch,
  IDispatchDocument,
  IDispatchDocumentStatics,
} from "./dispatch.types";

const dispatchSchema = new mongoose.Schema<IDispatchDocument>(
  {
    order: {
      type: ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },

    assignedRider: {
      type: ObjectId,
      ref: "Rider",
      default: null,
    },

    state: {
      type: String,
      enum: Object.values(DispatchStatus),
      default: DispatchStatus.CREATED,
      index: true,
    },

    currentAttempt: {
      type: Number,
      default: 0,
    },

    autoRetryCount: {
      type: Number,
      default: 0,
    },
    manualRetryCount: {
      type: Number,
      default: 0,
    },

    lastFailureReason: {
      type: String,
      default: null,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    endedAt: Date,
  },
  {
    timestamps: true,
  },
);

dispatchSchema.statics.transitionToSearching = async function (
  dispatchId: mongoose.Types.ObjectId,
) {
  return await this.findOneAndUpdate(
    {
      _id: dispatchId,
      state: DispatchStatus.CREATED,
    },
    {
      $set: {
        state: DispatchStatus.SEARCHING,
      },
    },
    {
      returnDocument: "after",
    },
  );
};

dispatchSchema.statics.incrementCurrentAttempt = async function (
  dispatchId: mongoose.Types.ObjectId,
  session?: mongoose.ClientSession,
) {
  await this.findByIdAndUpdate(
    dispatchId,
    {
      $inc: {
        currentAttempt: 1,
      },
    },
    {
      returnDocument: "after",
      session,
    },
  );
};

dispatchSchema.statics.incrementAutomaticRetry = async function (
  dispatchId: mongoose.Types.ObjectId,
  session?: mongoose.ClientSession,
) {
  await this.findByIdAndUpdate(
    dispatchId,
    {
      $inc: {
        autoRetryCount: 1,
      },
    },
    {
      returnDocument: "after",
      session,
    },
  );
};

dispatchSchema.statics.incrementManualRetry = async function (
  dispatchId: mongoose.Types.ObjectId,
  session?: mongoose.ClientSession,
) {
  await this.findByIdAndUpdate(
    dispatchId,
    {
      $inc: {
        manualRetryCount: 1,
      },
    },
    {
      returnDocument: "after",
      session,
    },
  );
};

dispatchSchema.statics.markAsFailed = async function (
  dispatchId: mongoose.Types.ObjectId,
  reason: string,
) {
  await this.findOneAndUpdate(
    {
      _id: dispatchId,
      state: {
        $nin: [DispatchStatus.ASSIGNED, DispatchStatus.FAILED],
      },
    },
    {
      $set: {
        state: DispatchStatus.FAILED,
        lastFailureReason: reason,
      },
    },
  );
};

dispatchSchema.statics.assignRider = async function (
  dispatchId: mongoose.Types.ObjectId,
  riderId: mongoose.Types.ObjectId,
  session?: mongoose.ClientSession,
) {
  return await this.findOneAndUpdate(
    {
      _id: dispatchId,
      state: DispatchStatus.SEARCHING,
      assignedRider: null,
    },
    {
      $set: {
        state: DispatchStatus.ASSIGNED,
        assignedRider: riderId,
      },
    },
    {
      returnDocument: "after",
      session,
    },
  );
};

const DispatchModel = mongoose.model<
  IDispatchDocument,
  mongoose.Model<IDispatch> & IDispatchDocumentStatics
>("Dispatch", dispatchSchema);
export default DispatchModel;
