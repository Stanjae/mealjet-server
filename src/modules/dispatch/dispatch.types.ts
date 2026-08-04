import {
  DispatchAttemptStatus,
  DispatchStatus,
  RiderOfferStatus,
} from "@shared/types/enums";
import mongoose, { Types, Document } from "mongoose";

export type IDispatchCandidate = {
  attempt: Types.ObjectId;

  rider: Types.ObjectId;

  order: Types.ObjectId;

  dispatch: Types.ObjectId;

  status: RiderOfferStatus;

  notifiedAt: Date;

  expiresAt: Date;

  respondedAt: Date;
};

export type IDispatchCandidateDocument = IDispatchCandidate & Document;

export type IDispatch = {
  order: Types.ObjectId;
  assignedRider: Types.ObjectId | null;
  state: DispatchStatus;
  autoRetryCount: number;
  manualRetryCount: number;
  startedAt: Date;
  endedAt: Date;
};

export type IDispatchDocument = IDispatch & Document;

export type IDispatchAttempt = {
  dispatch: Types.ObjectId;
  attemptNumber: number;
  radiusKm: number;

  timeoutSeconds: number;
  offersSent: number;
  state: DispatchAttemptStatus;

  startedAt: Date;

  endedAt: Date;
};

export interface IDispatchAttemptDocumentStatics {
  /**
   *   * Find the number of attempts for a given dispatch.
   * @param dispatchId — the ID of the dispatch
   */
  findAttemptPerDispatchCount(
    dispatchId: mongoose.Types.ObjectId,
  ): Promise<number>;

  /**
   * Increment the number of offers sent for a given dispatch attempt.
   * @param dispatchAttemptId — the ID of the dispatch attempt
   * @param incrementBy — the number to increment by (default is 1)
   */
  incrementOffersSent(
    dispatchAttemptId: mongoose.Types.ObjectId,
    incrementBy?: number,
  ): Promise<void>;

  /**
   * find the current active dispatch attempt for a given dispatch.
   * @param dispatchId — the ID of the dispatch
   */
  findActiveAttemptForDispatch(
    dispatchId: mongoose.Types.ObjectId,
  ): Promise<IDispatchAttemptDocument | null>;
}

export type IDispatchAttemptDocument = IDispatchAttempt & Document;
