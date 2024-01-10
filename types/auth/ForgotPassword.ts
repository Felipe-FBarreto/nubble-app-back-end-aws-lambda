export type IForgotPasswordEmail = {
  email: string;
};

export type IForgotPassword = {
  email: string;
  code: string;
  newPassword: string;
};
