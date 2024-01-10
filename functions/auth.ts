import { IConfirmEmail } from "./../types/auth/ConfirmEmail";
import { CognitoServices } from "./../services/CognitoSerices";
import { Handler, APIGatewayEvent } from "aws-lambda";
import {
  IStandardResponseFormat,
  standardResponseFormat,
} from "../utils/standardResponseFormat";
import { validateEnvs } from "../utils/validateEnvs";
import { Register } from "../types/auth/UserRegister";
import { emailRegex, passwordRegex } from "../contents/Regexes";
import { IUser } from "../types/models/User";
import { UserModel } from "../models/UserModel";

export const singUp: Handler = async (
  event: APIGatewayEvent,
): Promise<IStandardResponseFormat> => {
  try {
    const { error, USER_POOL_ID, USER_POOL_CLIENT_ID } = validateEnvs([
      "USER_POOL_ID",
      "USER_POOL_CLIENT_ID",
      "USER_TABLE",
    ]);

    if (error) {
      return standardResponseFormat(500, error);
    }

    if (!event.body) {
      return standardResponseFormat(
        400,
        "Paramtros necessários não informados",
      );
    }

    const { email, password, name } = JSON.parse(event.body) as Register;

    if (!email || !email.match(emailRegex)) {
      return standardResponseFormat(400, "Email inválido");
    }
    if (!password || !password.match(passwordRegex)) {
      return standardResponseFormat(400, "Senha inválido");
    }
    if (!name || name.length < 2) {
      return standardResponseFormat(400, "Nome inválido");
    }

    const cognitoUser = await new CognitoServices(
      USER_POOL_ID,
      USER_POOL_CLIENT_ID,
    ).singUp(email, password);
    const user = {
      name: email,
      cognitoId: cognitoUser.userSub,
    } as IUser;

    await UserModel.create(user);
    return standardResponseFormat(200, "Usuário cadastrado com sucesso");
  } catch (err) {
    console.log(err);
    return standardResponseFormat(500, "Não foi possível cadastrar usuário:");
  }
};

export const confirmEmail: Handler = async (
  event: APIGatewayEvent,
): Promise<IStandardResponseFormat> => {
  try {
    const { error, USER_POOL_ID, USER_POOL_CLIENT_ID } = validateEnvs([
      "USER_POOL_ID",
      "USER_POOL_CLIENT_ID",
    ]);

    if (error) {
      return standardResponseFormat(500, error);
    }

    if (!event.body) {
      return standardResponseFormat(
        400,
        "Paramentros de entrada não informados",
      );
    }

    const { code, email } = JSON.parse(event.body) as IConfirmEmail;

    if (!email || !email.match(emailRegex)) {
      return standardResponseFormat(400, "Email inválido");
    }
    if (!code || code.length < 4) {
      return standardResponseFormat(400, "Código inválido");
    }

    await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).confirmEmail(
      code,
      email,
    );

    return standardResponseFormat(200, "Email confirmado com sucesso");
  } catch (err) {
    console.log(err);
    return standardResponseFormat(
      500,
      "Não foi possível confirmar email, por favor entrar com contato com os desenvolvedores",
    );
  }
};
