import mongoose from "mongoose";
import {
  IDispatchAttempt,
  IDispatchAttemptDocument,
  IDispatchAttemptDocumentStatics,
} from "./dispatch.types";
import { DispatchAttemptStatus } from "@shared/types/enums";

const dispatchAttemptSchema = new mongoose.Schema<IDispatchAttemptDocument>(
  {
    dispatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispatch",
      required: true,
    },

    attemptNumber: {
      type: Number,
      required: true,
    },

    radiusKm: {
      type: Number,
      required: true,
    },

    timeoutSeconds: {
      type: Number,
      default: 15,
    },

    state: {
      type: String,
      enum: Object.values(DispatchAttemptStatus),
      default: DispatchAttemptStatus.SEARCHING,
    },

    offersSent: {
      type: Number,
      default: 0,
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

dispatchAttemptSchema.index(
  {
    dispatch: 1,
    attemptNumber: 1,
  },
  { unique: true },
);

dispatchAttemptSchema.statics.findAttemptPerDispatchCount = async function (
  dispatchId: mongoose.Types.ObjectId,
) {
  const count = await this.countDocuments({ dispatch: dispatchId });
  return count || 0;
};

dispatchAttemptSchema.statics.incrementOffersSent = async function (
  dispatchAttemptId: mongoose.Types.ObjectId,
  incrementBy: number = 1,
) {
  await this.updateOne(
    { _id: dispatchAttemptId },
    { $inc: { offersSent: incrementBy } },
  );
};

dispatchAttemptSchema.statics.findActiveAttemptForDispatch = async function (
  dispatchId: mongoose.Types.ObjectId,
) {
  const activeAttempt = await this.findOne({
    dispatch: dispatchId,
    state: DispatchAttemptStatus.SEARCHING,
  }).sort({ attemptNumber: -1 });
  return activeAttempt;
};

const DispatchAttemptModel = mongoose.model<
  IDispatchAttemptDocument,
  mongoose.Model<IDispatchAttempt> & IDispatchAttemptDocumentStatics
>("DispatchAttempt", dispatchAttemptSchema);
export default DispatchAttemptModel;
