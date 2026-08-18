import {
  DispatchAttemptStatus,
  DispatchStatus,
  RiderOfferStatus,
} from "@shared/types/enums";
import DispatchModel from "./dispatch.model";
import DispatchAttemptModel from "./dispatchAttempt.model";
import DispatchRiderOfferModel from "./dispatchRiderOffer.model";
import { IVendor } from "@modules/vendor";
import { IRiderDocument, riderService } from "@modules/rider";
import { enqueueDispatchJob } from "@shared/queues/dispatch.queue";
import { QUEUE_ACTIONS } from "@shared/constants/queue-actions.constants";
import { dispatchStrategy } from "./dispatchStrategy.constant";
import { IOrder } from "@modules/orders";
import { IDispatchAttemptDocument, IDispatchDocument } from "./dispatch.types";
import mongoose from "mongoose";
import { eventHandler } from "@shared/events/event";
import { eventActions } from "@shared/events/event.actions";
import { AppError } from "@shared/middleware/error.middleware";

class DispatchService {
  private dispatchRiderOfferModel = DispatchRiderOfferModel;
  private dispatchAttemptModel = DispatchAttemptModel;
  private eventBus = eventHandler;

  dispatchModel() {
    return DispatchModel;
  }

  private async getAvailabeRiderForDispatch(
    location: IVendor["location"],
    dispatch: IDispatchDocument,
    radiusKm: number,
  ) {
    const riders = await riderService
      .rider()
      .findNearby(
        location.coordinates[0],
        location.coordinates[1],
        radiusKm * 1000,
      );

    //Find everyone we've already contacted.
    const previousCandidates = await this.dispatchRiderOfferModel
      .find({
        dispatch: dispatch._id,
      })
      .select("rider");

    const alreadyNotified = new Set(
      previousCandidates.map((c) => c.rider.toString()),
    );
    const availableRiders = riders.filter(
      (r) => !alreadyNotified.has(r._id.toString()),
    );
    //also check if rider can accept more orders based on their current active delivery and availability status
    //not implemented yet, but will be added in the future.
    return availableRiders;
  }

  private async createDispatchAttempt(dispatch: IDispatchDocument) {
    const attemptNumber = dispatch.currentAttempt + 1;
    const radius =
      dispatchStrategy.STANDARD.initialRadiusKm +
      (attemptNumber - 1) * dispatchStrategy.STANDARD.radiusIncrementKm;

    const radiusKm = Math.min(radius, dispatchStrategy.STANDARD.maxRadiusKm);

    await this.dispatchModel().incrementCurrentAttempt(dispatch._id);

    return this.dispatchAttemptModel.create({
      dispatch: dispatch._id,
      attemptNumber,
      radiusKm,
    });
  }

  private async completeAttempt(dispatch: any, attempt: any) {
    const completed = await this.dispatchAttemptModel.markAsCompleted(
      attempt._id.toString(),
    );

    if (!completed) {
      return;
    }

    // Radius still available?
    if (attempt.radiusKm < dispatchStrategy.STANDARD.maxRadiusKm) {
      await enqueueDispatchJob(QUEUE_ACTIONS.START_DISPATCH, {
        dispatchId: dispatch._id.toString(),
      });

      return;
    }

    //Maximum radius exhausted.
    await this.retryDispatch(dispatch._id.toString());
  }

  //Creates a batch of offers.
  private async sendDispatchOffers(
    dispatch: IDispatchDocument,
    dispatchAttempt: IDispatchAttemptDocument,
    riders: IRiderDocument[],
  ) {
    const offers = riders
      .slice(0, dispatchStrategy.STANDARD.maximumOffersPerAttempt)
      .map((rider) => ({
        dispatch: dispatch._id,
        attempt: dispatchAttempt._id,
        rider: rider._id,
        order: dispatch.order._id,
        status: RiderOfferStatus.PENDING,
        notifiedAt: new Date(),
        expiresAt: new Date(
          Date.now() + dispatchStrategy.STANDARD.offerTimeoutSeconds * 1000,
        ),
      }));

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await this.dispatchRiderOfferModel.insertMany(offers, { session });
        await this.dispatchAttemptModel.incrementOffersSent(
          dispatchAttempt._id,
          offers.length,
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    this.eventBus.emit(eventActions.OFFERS_CREATED, {
      dispatchId: dispatch._id.toString(),
      dispatchAttemptId: dispatchAttempt._id.toString(),
    });

    await enqueueDispatchJob(
      QUEUE_ACTIONS.OFFER_TIMEOUT,
      {
        dispatchId: dispatch._id.toString(),
        dispatchAttemptId: dispatchAttempt._id.toString(),
      },
      { delay: dispatchStrategy.STANDARD.offerTimeoutSeconds * 1000 },
    );
  }

  async createDispatch(orderId: string): Promise<void> {
    const dispatch = await this.dispatchModel().create({
      order: orderId,
      state: DispatchStatus.CREATED,
    });

    await enqueueDispatchJob(
      QUEUE_ACTIONS.START_DISPATCH,
      {
        dispatchId: dispatch._id.toString(),
      },
      { jobId: `dispatch_${dispatch._id.toString()}` },
    );
  }

  async startDispatch(dispatchId: string): Promise<void> {
    const dispatch = await this.dispatchModel()
      .findById(dispatchId)
      .populate({ path: "order", populate: { path: "vendor" } });
    if (!dispatch) return;

    if (dispatch.state === DispatchStatus.SEARCHING) return;

    const order = dispatch.order as unknown as IOrder;

    const { location } = order.vendor as unknown as IVendor;

    await this.dispatchModel().transitionToSearching(dispatch._id);

    //create a dispatch attempt for this dispatch
    const dispatchAttempt = await this.createDispatchAttempt(dispatch);

    //find the first batch of riders and create dispatch candidates
    const riders = await this.getAvailabeRiderForDispatch(
      location,
      dispatch,
      dispatchAttempt.radiusKm,
    );

    if (riders.length === 0) {
      await this.completeAttempt(dispatch, dispatchAttempt);
      return;
    }

    await this.sendDispatchOffers(dispatch, dispatchAttempt, riders);
  }

  async offerTimeout(
    dispatchId: string,
    dispatchAttemptId?: string,
  ): Promise<void> {
    const attempt = await this.dispatchAttemptModel.findById(dispatchAttemptId);

    if (!attempt || attempt.state === DispatchAttemptStatus.COMPLETED) {
      return;
    }

    const dispatch = await this.dispatchModel()
      .findById(dispatchId)
      .populate({ path: "order", populate: { path: "vendor" } });

    if (!dispatch || dispatch.state === DispatchStatus.ASSIGNED) return;

    await this.dispatchRiderOfferModel.expireAttemptOffers(
      dispatchAttemptId as string,
    );

    //If somebody accepted before the timeout, stop here.
    const acceptedOffer = await this.dispatchRiderOfferModel.findAcceptedOffer(
      dispatchAttemptId as string,
    );

    if (acceptedOffer) {
      return;
    }

    await this.completeAttempt(dispatch, attempt);
  }

  //Automatic retry after all radius levels have been exhausted.
  async retryDispatch(dispatchId: string): Promise<void> {
    const dispatch = await this.dispatchModel().findById(dispatchId);

    if (!dispatch || dispatch.state === DispatchStatus.ASSIGNED) {
      return;
    }

    if (
      dispatch.autoRetryCount >=
      dispatchStrategy.STANDARD.maximumAutomaticRetries
    ) {
      await this.failDispatch(
        dispatch._id.toString(),
        "MAXIMUM_RETRIES_EXHAUSTED",
      );
      return;
    }

    await this.dispatchModel().incrementAutomaticRetry(dispatchId);

    await enqueueDispatchJob(
      QUEUE_ACTIONS.START_DISPATCH,
      {
        dispatchId,
      },
      {
        delay: dispatchStrategy.STANDARD.automaticRetryDelaySeconds * 1000,
      },
    );
  }

  //Vendor manually retries dispatch.
  async manualRetry(dispatchId: string) {
    const dispatch = await this.dispatchModel().findById(dispatchId);

    if (!dispatch) {
      return;
    }

    if (dispatch.state === DispatchStatus.ASSIGNED) {
      return;
    }

    if (dispatch.state !== DispatchStatus.FAILED) {
      return;
    }

    await this.dispatchModel().findByIdAndUpdate(dispatchId, {
      $set: {
        state: DispatchStatus.SEARCHING,

        lastFailureReason: null,
      },
    });

    await this.dispatchModel().incrementManualRetry(dispatchId);

    await enqueueDispatchJob(QUEUE_ACTIONS.START_DISPATCH, {
      dispatchId,
    });
  }

  //Permanently fail dispatch.
  private async failDispatch(dispatchId: string, reason: string) {
    const failed = await this.dispatchModel().markAsFailed(dispatchId, reason);

    if (!failed) {
      return;
    }

    this.eventBus.emit(eventActions.DISPATCH_FAILED, {
      dispatchId,

      orderId: failed.order.toString(),

      reason,
    });
  }

  //Rider accepts an offer. This is the most important transaction in the dispatch system.
  async acceptOffer(offerId: string, riderId: string) {
    const session = await mongoose.startSession();

    try {
      let acceptedOffer: any;
      let dispatch: any;

      await session.withTransaction(async () => {
        const offer = await this.dispatchRiderOfferModel.acceptOffer(
          offerId,
          riderId,
          session,
        );

        //If this returns null, somebody already processed the offer.

        if (!offer) {
          throw new AppError(404, "Offer is no longer available.");
        }

        dispatch = await this.dispatchModel()
          .findOne({
            _id: offer.dispatch,

            state: DispatchStatus.SEARCHING,

            assignedRider: null,
          })
          .session(session);

        if (!dispatch) {
          throw new Error("Dispatch is already assigned.");
        }

        //Atomic dispatch assignment.

        const assigned = await this.dispatchModel().assignRider(
          dispatch._id.toString(),
          riderId,
          session,
        );

        if (!assigned) {
          throw new Error("Dispatch was already assigned.");
        }

        //Cancel all remaining offers.

        await this.dispatchRiderOfferModel.cancelOtherOffers(
          dispatch._id.toString(),
          offer._id.toString(),
          session,
        );

        await this.dispatchAttemptModel.markAsCompleted(
          offer.attempt.toString(),
          session,
        );

        acceptedOffer = offer;
      });

      //Only emit after commit.

      this.eventBus.emit(eventActions.RIDER_ASSIGNED, {
        dispatchId: dispatch._id.toString(),

        orderId: acceptedOffer.order.toString(),

        riderId,
      });

      return acceptedOffer;
    } finally {
      await session.endSession();
    }
  }
}

const dispatchService = new DispatchService();
export default dispatchService;
