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

export interface IDispatchCandidateDocumentStatics {
  /**
   * Find the IDs of riders who have previously been offered a dispatch.
   * @param dispatchId — the ID of the dispatch
   */
  findPreviouslyOfferedRiderIds(
    dispatchId: mongoose.Types.ObjectId,
  ): Promise<mongoose.Types.ObjectId[]>;

  /**
   * Create multiple dispatch rider offers in a single operation.
   * @param offers — an array of dispatch rider offers to create
   * @param session — an optional mongoose session for transaction support
   */
  createBatch(
    offers: IDispatchCandidate[],
    session?: mongoose.ClientSession,
  ): Promise<void>;

  /**
   * Expire all pending offers for a given dispatch attempt.
   * @param attemptId — the ID of the dispatch attempt
   */
  expireAttemptOffers(attemptId: string): Promise<void>;

  /**
   * Find the accepted offer for a given dispatch attempt.
   * @param attemptId — the ID of the dispatch attempt
   */
  findAcceptedOffer(
    attemptId: string,
  ): Promise<IDispatchCandidateDocument | null>;

  /**
   * Find a pending offer by its ID.
   * @param offerId — the ID of the offer
   */
  findPendingOffer(
    offerId: mongoose.Types.ObjectId,
  ): Promise<IDispatchCandidateDocument | null>;

  /**
   * Accept a pending offer for a given rider and mark it as accepted.
   * @param offerId — the ID of the offer to accept
   * @param riderId — the ID of the rider accepting the offer
   * @param session — a mongoose session for transaction support
   */

  acceptOffer(
    offerId: string,
    riderId: string,
    session: mongoose.ClientSession,
  ): Promise<IDispatchCandidateDocument | null>;

  cancelOtherOffers(
    dispatchId: string,
    acceptedOfferId: string,
    session: mongoose.ClientSession,
  ): Promise<void>;
}

export type IDispatchCandidateDocument = IDispatchCandidate & Document;

export type IDispatch = {
  order: Types.ObjectId;
  assignedRider: Types.ObjectId | null;
  state: DispatchStatus;
  autoRetryCount: number;
  currentAttempt: number;
  manualRetryCount: number;
  lastFailureReason: string | null;
  startedAt: Date;
  endedAt: Date;
};

export interface IDispatchDocumentStatics {
  /**
   * Transition a dispatch from the "CREATED" state to the "SEARCHING" state.
   * @param dispatchId — the ID of the dispatch
   */
  transitionToSearching(
    dispatchId: mongoose.Types.ObjectId,
  ): Promise<IDispatchDocument>;

  /**
   * Increment the number of current attempts for a given dispatch.
   * @param dispatchId — the ID of the dispatch
   */
  incrementCurrentAttempt(
    dispatchId: mongoose.Types.ObjectId,
    session?: mongoose.ClientSession,
  ): Promise<IDispatchDocument>;

  /**
   * Increment the number of automatic retries for a given dispatch.
   * @param dispatchId — the ID of the dispatch
   */
  incrementAutomaticRetry(
    dispatchId: string,
    session?: mongoose.ClientSession,
  ): Promise<IDispatchDocument>;

  /**
   * Increment the number of manual retries for a given dispatch.
   * @param dispatchId — the ID of the dispatch
   */
  incrementManualRetry(
    dispatchId: string,
    session?: mongoose.ClientSession,
  ): Promise<IDispatchDocument>;

  /**
   * Assign a rider to a dispatch and transition the dispatch to the "ASSIGNED" state.
   * @param dispatchId — the ID of the dispatch
   * @param riderId — the ID of the rider to assign
   */
  assignRider(
    dispatchId: string,
    riderId: string,
    session?: mongoose.ClientSession,
  ): Promise<IDispatchDocument>;

  /**
   * Mark a dispatch as failed and transition it to the "FAILED" state.
   * @param dispatchId — the ID of the dispatch
   * @param reason — the reason for the failure
   */
  markAsFailed(
    dispatchId: string,
    reason: string,
    session?: mongoose.ClientSession,
  ): Promise<IDispatchDocument>;
}

export type IDispatchDocument = IDispatch & Document;

export type IDispatchAttempt = {
  dispatch: Types.ObjectId;
  attemptNumber: number;
  radiusKm: number;
  offersAccepted: number;
  timeoutSeconds: number;
  offersSent: number;
  state: DispatchAttemptStatus;
  startedAt: Date;
  endedAt: Date;
};

export interface IDispatchAttemptDocumentStatics {
  /**
   * Increment the number of offers sent for a given dispatch attempt.
   * @param dispatchAttemptId — the ID of the dispatch attempt
   * @param incrementBy — the number to increment by (default is 1)
   */
  incrementOffersSent(
    dispatchAttemptId: mongoose.Types.ObjectId,
    incrementBy?: number,
    session?: mongoose.ClientSession,
  ): Promise<void>;

  /**
   * find the current active dispatch attempt for a given dispatch.
   * @param dispatchId — the ID of the dispatch
   */
  findActiveAttemptForDispatch(
    dispatchId: mongoose.Types.ObjectId,
  ): Promise<IDispatchAttemptDocument | null>;

  /**
   * Mark a dispatch attempt as completed and transition it to the "COMPLETED" state.
   * @param dispatchAttemptId — the ID of the dispatch attempt
   */
  markAsCompleted(
    dispatchAttemptId: string,
    session?: mongoose.ClientSession,
  ): Promise<IDispatchAttemptDocument>;
}

export type IDispatchAttemptDocument = IDispatchAttempt & Document;
