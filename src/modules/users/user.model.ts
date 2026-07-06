import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser } from "./user.types";
import { USER_ROLES, USER_STATUSES } from "@shared/constants/auth.constants";
import { addressSchema } from "@shared/models/shared.models";

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUserDocument>(
  {
    username: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    phone: { type: String, sparse: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    passwordHash: { type: String, select: false }, // Never returned by default
    role: {
      type: String,
      enum: USER_ROLES,
      default: "customer",
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: "pending_verification",
    },
    avatar: { type: String },
    relatedEntityStatus: {
      type: String,
      enum: ["approved", "in-review", "pending"],
      default: "pending",
    },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, sparse: true },
    refreshTokens: { type: [String], default: [], select: false },
    savedAddresses: { type: [addressSchema], default: [] },
    currentAddress: { type: addressSchema },
    walletBalance: { type: Number, default: 0 },
    fcmToken: { type: String },
    lastLogin: { type: Date },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat] - GeoJSON order!
    },
  },
  { timestamps: true },
);

// Hash password before save — only if modified
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash") || !this.passwordHash) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (
  candidate: string,
): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

export const UserModel = model<IUserDocument>("User", userSchema);
