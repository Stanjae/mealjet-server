export type TDispatchJob = {
  dispatchId: string;
};

export type VerificationEmailJob = {
  to: string;
  name: string;
  token: string;
  isLogin?: boolean;
};

export type TNotificationJob = {
  dispatchId?: string;
  dispatchAttemptId?: string;
};
