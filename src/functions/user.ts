import { UserModel } from "../../src/models/UserModel";
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
