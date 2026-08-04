import { DispatchStatus } from "@shared/types/enums";
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
import { enqueueNotificationJob } from "@shared/queues/notification.queue";

class DispatchService {
  private dispatchRiderOfferModel = DispatchRiderOfferModel;
  private dispatchAttemptModel = DispatchAttemptModel;

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

    const alreadyNotified = previousCandidates.map((c) =>
      c.rider._id?.toString(),
    );

    const availableRiders = riders.filter(
      (r) => !alreadyNotified.includes(r._id.toString()),
    );
    //also check if rider can accept more orders based on their current active delivery and availability status
    //not implemented yet, but will be added in the future.
    return availableRiders;
  }

  private async createDispatchAttempt(dispatch: IDispatchDocument) {
    const attemptCount =
      await this.dispatchAttemptModel.findAttemptPerDispatchCount(dispatch._id);

    const attemptNumber = attemptCount + 1;
    const radius =
      dispatchStrategy.STANDARD.initialRadiusKm +
      (attemptNumber - 1) * dispatchStrategy.STANDARD.radiusIncrementKm;

    const radiusKm = Math.min(radius, dispatchStrategy.STANDARD.maxRadiusKm);

    return this.dispatchAttemptModel.create({
      dispatch: dispatch._id,
      attemptNumber,
      radiusKm,
    });
  }

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
        status: "notified",
        notifiedAt: new Date(),
        expiresAt: new Date(
          Date.now() + dispatchStrategy.STANDARD.offerTimeoutSeconds * 1000,
        ),
      }));

    await this.dispatchRiderOfferModel.insertMany(offers);
    await this.dispatchAttemptModel.incrementOffersSent(
      dispatchAttempt._id,
      offers.length,
    );

    await enqueueNotificationJob(QUEUE_ACTIONS.SEND_RIDER_OFFER_NOTIFICATION, {
      dispatchId: dispatch._id.toString(),
      dispatchAttemptId: dispatchAttempt._id.toString(),
    });

    await enqueueDispatchJob(
      QUEUE_ACTIONS.OFFER_TIMEOUT,
      {
        dispatchId: dispatch._id.toString(),
      },
      { delay: dispatchStrategy.STANDARD.offerTimeoutSeconds * 1000 },
    );
  }

  dispatchModel() {
    return DispatchModel;
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
      .populate("order")
      .populate("vendor");

    if (!dispatch) return;

    if (dispatch.state === DispatchStatus.SEARCHING) return;

    const order = dispatch.order as unknown as IOrder;

    const { location } = order.vendor as unknown as IVendor;

    //create a dispatch attempt for this dispatch
    const dispatchAttempt = await this.createDispatchAttempt(dispatch);

    //find the first batch of riders and create dispatch candidates
    const riders = await this.getAvailabeRiderForDispatch(
      location,
      dispatch,
      dispatchAttempt.radiusKm,
    );

    if (riders.length === 0) {
      //return this.retryDispatch(dispatchId);
      console.log("No riders available for dispatch.");
      return;
    }

    await this.sendDispatchOffers(dispatch, dispatchAttempt, riders);
  }

  async retryDispatch(dispatchId: string): Promise<void> {
    const dispatch = await this.dispatchModel().findById(dispatchId);

    if (!dispatch) {
      return;
    }

    if (dispatch.state === DispatchStatus.ASSIGNED) {
      return;
    }

    console.log("No rider accepted.");
  }
}

const dispatchService = new DispatchService();
export default dispatchService;
