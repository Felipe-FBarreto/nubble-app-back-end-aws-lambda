import { APIGatewayEvent } from "aws-lambda";

export const getUserIdFromEvent = (event: APIGatewayEvent) => {
  const id = event?.requestContext?.authorizer?.jwt?.claims["sub"];

  if (!id) return null;
  return id;
};
