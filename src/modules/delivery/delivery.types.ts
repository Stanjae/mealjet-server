import { Types } from "mongoose";
import { DeliveryStatus } from "./delivery.constants";

export interface IDelivery {
    rider: Types.ObjectId;
    orders: Types.ObjectId[];
    status: DeliveryStatus;
}