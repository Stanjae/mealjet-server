import { Schema } from "mongoose";
import { IBankDetails, ILocation, TSupportingDocuments } from "./shared.types";
import { IAddress } from "@modules/users/user.types";

export const bankDetailsSchema = new Schema<IBankDetails>(
  {
    bankName: { type: String, required: true },
    bankCode: { type: String },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
  },
  { _id: false },
);

export const PointSchema = new Schema<ILocation>(
  {
    type: {
      type: String,
      enum: ["Point"] as const,
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator([lng, lat]: number[]) {
          return (
            typeof lng === "number" &&
            typeof lat === "number" &&
            lng >= -180 &&
            lng <= 180 &&
            lat >= -90 &&
            lat <= 90
          );
        },
        message:
          "coordinates must be [longitude, latitude] within valid ranges",
      },
    },
  },
  { _id: false },
);

export const DocumentsSchema = new Schema<TSupportingDocuments>(
  {
    govtId: { type: String, trim: true, default: null },
    drivingLicense: { type: String, trim: true, default: null },
    vehicleInsurance: { type: String, trim: true, default: null },
  },
  { _id: false },
);

export const addressSchema = new Schema<IAddress>(
  {
    formattedAddress: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: { type: String },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  { _id: true },
);
