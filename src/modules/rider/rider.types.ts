import { IAddress } from "@modules/users/user.types";
import {
  IBankDetails,
  ILocation,
} from "@shared/models/shared.types";
import {
  AvailabilityStatus,
  RiderStatus,
  VehicleType,
} from "@shared/types/enums";
import mongoose, { Document, Model, Types } from "mongoose";

export type TDriverStatus = RiderStatus;

export type TAvailabilityStatus = AvailabilityStatus;

export type TVehicleType = VehicleType;

export interface TRider {
  first_name: string | null;
  last_name: string | null;
  owner: Types.ObjectId;
  status: TDriverStatus;
  availability_status: TAvailabilityStatus;
  vehicle_type: TVehicleType;
  vehicle_plate_no: string | null;
  proof_of_identification: string;
  profile_picture: string;
  vehicle_document: string | null;
  address: IAddress;

  // ── Location ────────────────────────────────────────────────────────────────
  currentLocation: ILocation | null;
  locationUpdatedAt: Date | null;

  totalDeliveries: number;
  avgRating: number;
  totalRatings: number;

  // ── Financials ───────────────────────────────────────────────────────────────
  /** Pending earnings not yet paid out — stored in Naira Kobo (minor unit) */
  walletBalance: number;
  /** Lifetime gross earnings — stored in Naira Kobo */
  totalEarnings: number;
  bankDetails: IBankDetails;

  // ── Active delivery ─────────────────────────────────────────────────────────────
  activeDelivery: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Driver virtuals ────────────────────────────────────────────────

export interface IRiderVirtuals {
  /** Decrypted bank details — never persisted */
  bankDetailsDecrypted: IBankDetails | null;
  /** true when status=active, availabilityStatus=online, activeOrder=null */
  isAvailable: boolean;
}

export type IRiderDocument = Document & TRider & IRiderVirtuals & IRiderMethods;

// ─── Static methods interface ─────────────────────────────────────────────────

export interface IRiderStatics {
  /**
   * Find nearby online, active, unoccupied drivers sorted by proximity.
   * @param lng          — pickup longitude
   * @param lat          — pickup latitude
   * @param radiusMetres — search radius (default 5 000 m)
   */
  findNearby(
    lng: number,
    lat: number,
    radiusMetres?: number,
  ): mongoose.QueryWithHelpers<IRiderDocument[], IRiderDocument>;
}

// ─── Instance methods interface ───────────────────────────────────────────────

export interface IRiderMethods {
  /**
   * Recalculate avgRating after a new review.
   * Never write avgRating directly — always call this method.
   */
  addRating(newRating: number): Promise<IRiderDocument>;

  /**
   * Update live GPS position.
   * Called by the rider app every ~10 s while online.
   */
  updateLocation(lng: number, lat: number): Promise<IRiderDocument>;

  /**
   * Credit earnings to wallet + lifetime total.
   * @param amount — amount in Kobo
   */
  creditEarnings(amount: number): Promise<IRiderDocument>;

  /**
   * Debit wallet for a payout. Throws if balance is insufficient.
   * @param amount — amount in Kobo
   */
  debitWallet(amount: number): Promise<IRiderDocument>;
}

// ─── Combined document type ───────────────────────────────────────────────────

export type IRiderModel = Model<TRider, object, IRiderMethods> & IRiderStatics;
