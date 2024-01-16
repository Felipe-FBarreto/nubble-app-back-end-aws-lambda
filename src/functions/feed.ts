import { S3Services } from "./../services/S2Services";
import { UserModel } from "./../models/UserModel";
import { getUserIdFromEvent } from "./../utils/authenticateUse";
import { validateEnvs } from "./../utils/validateEnvs";
import { Handler, APIGatewayEvent } from "aws-lambda";
import {
  IStandardResponseFormat,
  standardResponseFormat,
} from "../utils/standardResponseFormat";
import { PostModel } from "../models/PostModel";
import { feedLastKeyRequest } from "../types/feeds/feedLastKeyRequest";
import { DefaultPaginatedListResponse } from "../types/user/DeafultListPaginatedResponse";

export const findByUserId: Handler = async (
  event: any,
): Promise<IStandardResponseFormat> => {
  try {
    const { error, POST_BUCKET } = validateEnvs([
      "USER_TABLE",
      "POST_TABLE",
      "POST_BUCKET",
    ]);
    if (error) {
      return standardResponseFormat(500, error);
    }
    const { userId } = event.pathParameters || {
      userId: getUserIdFromEvent(event),
    };

    const user = UserModel.get({ cognitoId: userId });

    if (!user) {
      return standardResponseFormat(400, "Usuário não encontrado");
    }

    const query = PostModel.query({ userId: userId }).sort("descending");

    const lastKey = (event.queryStringParameters || "") as feedLastKeyRequest;

    if (lastKey && lastKey.id && lastKey.userId && lastKey.date) {
      query.startAt(lastKey);
    }

    const result = await query.limit(1).exec();

    const response = {} as DefaultPaginatedListResponse;

    if (result) {
      response.lastKey = result.lastKey;
      response.count = result.count;

      for (const post of result) {
        if (post && post.image) {
          post.image = await new S3Services().getImageS3(
            POST_BUCKET,
            post.image,
          );
        }
      }
      response.data = result;
    }
    return standardResponseFormat(200, undefined, response);
  } catch (err) {
    console.log(err);
    return standardResponseFormat(500, "Não foi possível buscar feed");
  }
};

export const getFeedHome: Handler = async (
  event: any,
): Promise<IStandardResponseFormat> => {
  try {
    const { error, POST_BUCKET } = validateEnvs([
      "USER_TABLE",
      "POST_TABLE",
      "POST_BUCKET",
    ]);
    if (error) {
      return standardResponseFormat(500, error);
    }
    const userId = getUserIdFromEvent(event);
    const { lastKey } = event.queryStringParameters || "";
    const user = await UserModel.get({ cognitoId: userId });
    console.log("🚀 ~ user:", user);

    if (!user) {
      return standardResponseFormat(400, "Usuário não encontrado");
    }
    const usersToFeed = user.following;
    usersToFeed.push(userId);
    console.log("🚀 ~ usersToFeed:", usersToFeed);

    const query = PostModel.scan("userId").in(usersToFeed);

    if (lastKey) {
      query.startAt({ id: lastKey });
    }

    const result = await query.limit(3).exec();

    const response = {} as DefaultPaginatedListResponse;

    if (result) {
      response.lastKey = result.lastKey;
      response.count = result.count;

      for (const post of result) {
        if (post && post.image) {
          post.image = await new S3Services().getImageS3(
            POST_BUCKET,
            post.image,
          );
        }
      }
      response.data = result;
    }
    return standardResponseFormat(200, undefined, response);
  } catch (err) {
    console.log(err);
    return standardResponseFormat(500, "Não foi possível buscar feed da home");
  }
};
