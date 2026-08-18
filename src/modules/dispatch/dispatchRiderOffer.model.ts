import mongoose from "mongoose";
import {
  IDispatchCandidate,
  IDispatchCandidateDocument,
  IDispatchCandidateDocumentStatics,
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

dispatchRiderOfferSchema.statics.findPreviouslyOfferedRiderIds =
  async function (dispatchId: mongoose.Types.ObjectId) {
    return await this.distinct("rider", { dispatch: dispatchId });
  };

dispatchRiderOfferSchema.statics.createBatch = async function (
  offers: IDispatchCandidate[],
  session?: mongoose.ClientSession,
) {
  return await this.insertMany(offers, { session });
};

dispatchRiderOfferSchema.statics.expireAttemptOffers = async function (
  attemptId: mongoose.Types.ObjectId,
) {
  return await this.updateMany(
    {
      attempt: attemptId,
      status: RiderOfferStatus.PENDING,
    },
    {
      $set: {
        status: RiderOfferStatus.EXPIRED,
        respondedAt: new Date(),
      },
    },
  );
};

dispatchRiderOfferSchema.statics.findAcceptedOffer = async function (
  attemptId: mongoose.Types.ObjectId,
) {
  return await this.findOne({
    attempt: attemptId,
    status: RiderOfferStatus.ACCEPTED,
  });
};

dispatchRiderOfferSchema.statics.findPendingOffer = async function (
  offerId: mongoose.Types.ObjectId,
) {
  return await this.findOne({
    _id: offerId,
    status: RiderOfferStatus.PENDING,
  });
};

dispatchRiderOfferSchema.statics.acceptOffer = async function (
  offerId: mongoose.Types.ObjectId,
  riderId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession,
) {
  return await this.findOneAndUpdate(
    {
      _id: offerId,
      rider: riderId,
      status: RiderOfferStatus.PENDING,
      expiresAt: {
        $gt: new Date(),
      },
    },
    {
      $set: {
        status: RiderOfferStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    },
    {
      new: true,
      session,
    },
  );
};

dispatchRiderOfferSchema.statics.cancelOtherOffers = async function (
  dispatchId: mongoose.Types.ObjectId,
  acceptedOfferId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession,
) {
  return await this.updateMany(
    {
      dispatch: dispatchId,
      _id: {
        $ne: acceptedOfferId,
      },
      status: RiderOfferStatus.PENDING,
    },
    {
      $set: {
        status: RiderOfferStatus.CANCELLED,
      },
    },
    {
      session,
    },
  );
};

const DispatchRiderOfferModel = mongoose.model<
  IDispatchCandidateDocument,
  mongoose.Model<IDispatchCandidate> & IDispatchCandidateDocumentStatics
>("DispatchRiderOffer", dispatchRiderOfferSchema);
export default DispatchRiderOfferModel;
