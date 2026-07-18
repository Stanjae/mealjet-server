import { model, Schema } from "mongoose";
import { IDelivery } from "./delivery.types";
import { DeliveryStatus } from "./delivery.constants";

const deliverySchema = new Schema<IDelivery>(
  {
    rider: {
      type: Schema.Types.ObjectId,
      ref: "Rider",
      required: true,
      index: true,
    },
    orders: [
      {
        type: Schema.Types.ObjectId,
        ref: "Order",
        required: true,
      },
    ],
    status: {
      type: String,
      enum: {
        values: Object.values(DeliveryStatus),
      },
    },
  },
  { timestamps: true },
);

const Delivery = model<IDelivery>("Delivery", deliverySchema);
