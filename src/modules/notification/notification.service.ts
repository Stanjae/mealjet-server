class NotificationService {
  async sendDispatchOfferNotification(
    dispatchId: string | undefined,
  ): Promise<void> {}
}

const notificationService = new NotificationService();
export default notificationService;
