import { DefaultResponseMessage } from "./../types/DefaultResponseMessage";

export type IStandardResponseFormat = {
  statusCode: number;
  headers: object;
  body: string;
};

export const standardResponseFormat = (
  statusCode: number,
  message: string | undefined,
  response?: Record<string, unknown>,
): IStandardResponseFormat => {
  const defaultMessage: DefaultResponseMessage = {};

  if (message && statusCode >= 200 && statusCode <= 399) {
    defaultMessage.message = message;
  } else if (message) {
    defaultMessage.error = message;
  }

  return {
    statusCode,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(response || defaultMessage),
  };
};
