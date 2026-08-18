export type TDispatchJob = {
  dispatchId: string;
  dispatchAttemptId?: string;
};

export type TVerificationEmailJob = {
  to: string;
  name: string;
  token: string;
  isLogin?: boolean;
};

export type TNotificationJob = {
  dispatchId?: string;
  dispatchAttemptId?: string;
  riderId?: string;
};
