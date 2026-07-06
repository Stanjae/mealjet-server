// src/modules/users/user.types.ts

import { USER_ROLES } from "@shared/constants/auth.constants";
import { ILocation } from "@shared/models/shared.types";

export type UserRole = typeof USER_ROLES[number];
export type UserStatus =
  | "active"
  | "suspended"
  | "pending_verification"
  | "banned";
export type AuthProvider = "local" | "google";
export type RelatedEntityStatus = "approved" | "in-review" | "pending";

export interface IAddress {
  _id?: string;
  formattedAddress: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface IUser {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  passwordHash?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  relatedEntityStatus: RelatedEntityStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  authProvider: AuthProvider;
  googleId?: string;
  refreshTokens: string[];
  savedAddresses: IAddress[];
  currentAddress?: IAddress;
  walletBalance: number;
  fcmToken?: string;
  lastLogin?: Date;
  location: ILocation;
}

// DTO types for API responses (never expose passwordHash or refreshTokens)
export type UserPublicDto = Omit<
  IUser,
  "passwordHash" | "refreshTokens" | "googleId"
>;
