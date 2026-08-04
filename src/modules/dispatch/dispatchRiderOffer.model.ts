import mongoose from "mongoose";
import {
  IDispatchCandidate,
  IDispatchCandidateDocument,
} from "./dispatch.types";
import { RiderOfferStatus } from "@shared/types/enums";

const dispatchRiderOfferSchema =
  new mongoose.Schema<IDispatchCandidateDocument>(
    {
      rider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Rider",
        required: true,
      },

      dispatch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Dispatch",
        required: true,
      },

      order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
      },

      status: {
        type: String,
        enum: Object.values(RiderOfferStatus),
        default: RiderOfferStatus.PENDING,
        index: true,
      },

      notifiedAt: {
        type: Date,
        default: Date.now,
      },

      expiresAt: {
        type: Date,
        required: true,
        index: true,
      },

      attempt: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DispatchAttempt",
      },

      respondedAt: Date,
    },
    {
      timestamps: true,
    },
  );

dispatchRiderOfferSchema.index(
  {
    attempt: 1,
    rider: 1,
  },
  { unique: true },
);

dispatchRiderOfferSchema.index({
  status: 1,
  rider: 1,
});

const DispatchRiderOfferModel = mongoose.model<
  IDispatchCandidateDocument,
  mongoose.Model<IDispatchCandidate>
>("DispatchRiderOffer", dispatchRiderOfferSchema);
export default DispatchRiderOfferModel;
