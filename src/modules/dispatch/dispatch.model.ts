import { DispatchStatus } from "@shared/types/enums";
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;
import { IDispatch, IDispatchDocument } from "./dispatch.types";

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

    autoRetryCount: {
      type: Number,
      default: 0,
    },
    manualRetryCount: {
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

const DispatchModel = mongoose.model<
  IDispatchDocument,
  mongoose.Model<IDispatch>
>("Dispatch", dispatchSchema);
export default DispatchModel;
