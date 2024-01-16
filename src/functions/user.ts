import { UserModel } from "../models/UserModel";
import { getUserIdFromEvent } from "../../src/utils/authenticateUse";
import { validateEnvs } from "../../src/utils/validateEnvs";
import {
  IStandardResponseFormat,
  standardResponseFormat,
} from "../../src/utils/standardResponseFormat";
import { Handler, APIGatewayEvent } from "aws-lambda";
import { S3Services } from "../services/S2Services";
import { parse } from "aws-multipart-parser";
import { IUserUpdated } from "../types/user/userUpdate";
import { imageAllowedExtensions } from "../contents/Regexes";
import { CognitoServices } from "../services/CognitoSerices";
import { DefaultPaginatedListResponse } from "../types/user/DeafultListPaginatedResponse";

export const me: Handler = async (
  event: APIGatewayEvent,
): Promise<IStandardResponseFormat> => {
  try {
    const { error, AVATAR_BUCKET } = validateEnvs([
      "USER_TABLE",
      "AVATAR_BUCKET",
    ]);

    if (error) {
      return standardResponseFormat(500, error);
    }
    const userId = getUserIdFromEvent(event);

    if (!userId) {
      return standardResponseFormat(
        400,
        "Não autoriazado por falta de token jwt",
      );
    }

    const user = await UserModel.get({ cognitoId: userId });

    if (user && user.avatar) {
      const url = await new S3Services().getImageS3(AVATAR_BUCKET, user.avatar);
      user.avatar = url;
    }
    if (!user) {
      return standardResponseFormat(400, "Usário não encontrado");
    }
    return standardResponseFormat(200, undefined, user);
  } catch (err) {
    console.log(err);
    return standardResponseFormat(
      500,
      "Não foi possível trazer dados do usuário",
    );
  }
};

export const deleteAvatar = async (
  event: APIGatewayEvent,
): Promise<IStandardResponseFormat> => {
  try {
    const { error, AVATAR_BUCKET } = validateEnvs([
      "AVATAR_BUCKET",
      "USER_TABLE",
    ]);
    if (error) {
      return standardResponseFormat(500, error);
    }
    const userId = getUserIdFromEvent(event);
    const user = await UserModel.get({ cognitoId: userId });
    if (!user) {
      return standardResponseFormat(400, "Usuário não encontrado");
    }
    if (user && user.avatar) {
      await new S3Services().deleteImage(AVATAR_BUCKET, user.avatar);
      user.avatar = undefined;
      await UserModel.update(user);
    }
    return standardResponseFormat(200, "Avatar exluido com sucesso");
  } catch (err) {
    console.log(err);
    return standardResponseFormat(500, "Não foi possível deleter sua avatar");
  }
};

export const update: Handler = async (
  event: APIGatewayEvent,
): Promise<IStandardResponseFormat> => {
  try {
    const { error, AVATAR_BUCKET } = validateEnvs([
      "USER_TABLE",
      "AVATAR_BUCKET",
    ]);

    if (error) {
      return standardResponseFormat(500, error);
    }
    const userId = getUserIdFromEvent(event);

    if (!userId) {
      return standardResponseFormat(
        400,
        "Não autoriazado por falta de token jwt",
      );
    }

    const user = await UserModel.get({ cognitoId: userId });
    if (!event.body) {
      return standardResponseFormat(400, "Parâmetros de entrada necessários");
    }
    const { file, name } = parse(event, true) as IUserUpdated;

    if (name && name.length < 2) {
      return standardResponseFormat(400, "Nome inválido");
    } else if (name) {
      user.name = name;
      await UserModel.update(user);
    }

    if (file && !imageAllowedExtensions.exec(file.filename)) {
      return standardResponseFormat(400, "Extensão do arquivo incorreta");
    } else if (file) {
      await new S3Services().deleteImage(AVATAR_BUCKET, user.avatar);
      const key = await new S3Services().saveImageS3(
        AVATAR_BUCKET,
        "avatar",
        file,
      );
      user.avatar = key;
      await UserModel.update(user);
    }

    return standardResponseFormat(
      200,
      "Dados do usuário alterados com sucesso",
    );
  } catch (err) {
    console.log(err);
    return standardResponseFormat(
      500,
      "Não foi possível alterar dados do usuário",
    );
  }
};

export const searchUser: Handler = async (
  event: any,
): Promise<IStandardResponseFormat> => {
  try {
    const { error, AVATAR_BUCKET } = validateEnvs([
      "USER_TABLE",
      "AVATAR_BUCKET",
    ]);

    if (error) {
      return standardResponseFormat(500, error);
    }

    const { filter } = event.pathParameters;
    const { lastKey } = event.queryStringParameters || "";

    if (!filter || filter.length < 2) {
      return standardResponseFormat(400, "Parâmetros de buscas inválidos");
    }
    const query = UserModel.scan()
      .where("name")
      .contains(filter)
      .or()
      .where("email")
      .contains(filter);

    if (lastKey) {
      query.startAt({ cognitoId: lastKey });
    }

    const result = await query.limit(2).exec();

    const response = {} as DefaultPaginatedListResponse;

    if (result) {
      response.lastKey = result.lastKey;
      response.count = result.count;

      for (const data of result) {
        if (data && data.avatar) {
          data.avatar = await new S3Services().getImageS3(
            AVATAR_BUCKET,
            data.avatar,
          );
        }
      }
      response.data = result;
    }

    return standardResponseFormat(200, undefined, response);
  } catch (err) {
    console.log(err);
    return standardResponseFormat(500, "Não foi possível buscar usuário");
  }
};

export const follow: Handler = async (
  event: any,
): Promise<IStandardResponseFormat> => {
  try {
    const { error } = validateEnvs(["USER_TABLE"]);
    if (error) {
      return standardResponseFormat(500, error);
    }
    const followerUserId = getUserIdFromEvent(event);
    const followerUser = await UserModel.get({ cognitoId: followerUserId });
    if (!followerUser) {
      return standardResponseFormat(400, "Usuário não encontrado");
    }

    const { followedUserId } = event.pathParameters;

    if (!followedUserId) {
      return standardResponseFormat(400, "Parâmetro da url necessário");
    }
    const followedUser = await UserModel.get({ cognitoId: followedUserId });

    if (followerUserId === followedUserId) {
      return standardResponseFormat(400, "Não pode seguir você mesmo");
    }
    const hasIndex = followedUser.following.findIndex(
      (fl) => fl.toString() === followerUserId,
    );

    if (hasIndex != -1) {
      followedUser.following.splice(hasIndex, 1);
      await UserModel.update(followedUser);
      followerUser.followers -= 1;
      await UserModel.update(followerUser);
      return standardResponseFormat(200, "Você deixou de seguir este usuário");
    } else {
      followedUser.following.push(followerUserId);
      await UserModel.update(followedUser);
      followerUser.followers += 1;
      await UserModel.update(followerUser);
      return standardResponseFormat(200, "Você começou a seguir este usuário");
    }
  } catch (err) {
    console.log(err);
    return standardResponseFormat(
      500,
      "Não foi possível seguir ou deixar de seguir este usuário",
    );
  }
};
