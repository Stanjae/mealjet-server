export type TVerificationEmailJob = {
  to: string;
  name: string;
  token: string;
  isLogin?: boolean;
};

export type TDispatchJob = {
  dispatchId: string;
};
