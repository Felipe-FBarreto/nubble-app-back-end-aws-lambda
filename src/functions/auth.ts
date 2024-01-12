import {
  IForgotPassword,
  IForgotPasswordEmail,
} from "../../src/types/auth/ForgotPassword";
import { IConfirmEmail } from "../../src/types/auth/ConfirmEmail";
import { CognitoServices } from "../../src/services/CognitoSerices";
import { Handler, APIGatewayEvent } from "aws-lambda";
import {
  IStandardResponseFormat,
  standardResponseFormat,
} from "../../src/utils/standardResponseFormat";
import { validateEnvs } from "../../src/utils/validateEnvs";
import { Register } from "../../src/types/auth/UserRegister";
import {
  emailRegex,
  imageAllowedExtensions,
  passwordRegex,
} from "../contents/Regexes";
import { IUser } from "../../src/types/models/User";
import { UserModel } from "../../src/models/UserModel";
import { parse } from "aws-multipart-parser";
import { S3Services } from "../../src/services/S2Services";
import { ILogin } from "../../src/types/auth/Login";

export const singUp: Handler = async (
  event: APIGatewayEvent,
): Promise<IStandardResponseFormat> => {
  try {
    const { error, USER_POOL_ID, USER_POOL_CLIENT_ID, AVATAR_BUCKET } =
      validateEnvs([
        "USER_POOL_ID",
        "USER_POOL_CLIENT_ID",
        "USER_TABLE",
        "AVATAR_BUCKET",
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

    const formaData = parse(event, true);
    const { email, name, password, file } = formaData as Register;

    if (!email || !email.match(emailRegex)) {
      return standardResponseFormat(400, "Email inválido");
    }
    if (!password || !password.match(passwordRegex)) {
      return standardResponseFormat(400, "Senha inválido");
    }
    if (!name || name.length < 2) {
      return standardResponseFormat(400, "Nome inválido");
    }

    if (file && !imageAllowedExtensions.exec(file.filename)) {
      return standardResponseFormat(400, "Extensão do arquivo inválido");
    }

    let key = undefined;
    if (file) {
      key = await new S3Services().saveImageS3(AVATAR_BUCKET, "avatar", file);
    }

    const cognitoUser = await new CognitoServices(
      USER_POOL_ID,
      USER_POOL_CLIENT_ID,
    ).singUp(email, password);
    const user = {
      name,
      email,
      cognitoId: cognitoUser.userSub,
      avatar: key,
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
    if (!code || code.length < 6) {
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

export const forgotPassword: Handler = async (
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
        "Parâmetros de entrada não informados",
      );
    }
    const { email } = JSON.parse(event.body) as IForgotPasswordEmail;

    if (!email || !email.match(emailRegex)) {
      return standardResponseFormat(400, "Email inválido");
    }
    await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).forgotPassword(
      email,
    );
    return standardResponseFormat(
      200,
      "Email com o código de verificação enviado com sucesso ",
    );
  } catch (err) {
    console.log(err);
    return standardResponseFormat(
      500,
      "Não foi possível enviar email para recuperar a senha, por favor entrar em contato com os desenvolvedores",
    );
  }
};

export const confirmPassword: Handler = async (
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
        "Parâmetros de entrada não informados",
      );
    }
    const { email, code, newPassword } = JSON.parse(
      event.body,
    ) as IForgotPassword;

    if (!email || !email.match(emailRegex)) {
      return standardResponseFormat(400, "Email inválido");
    }
    if (!code || code.length < 6) {
      return standardResponseFormat(400, "Código inválido");
    }
    if (!newPassword || !newPassword.match(passwordRegex)) {
      return standardResponseFormat(400, "Senha inválida`");
    }
    await new CognitoServices(
      USER_POOL_ID,
      USER_POOL_CLIENT_ID,
    ).confirmPassword(code, newPassword, email);
    return standardResponseFormat(200, "Senha alterada com sucesso");
  } catch (err) {
    console.log(err);
    return standardResponseFormat(
      500,
      "Não foi possível enviar email para recuperar a senha, por favor entrar em contato com os desenvolvedores",
    );
  }
};

export const login: Handler = async (
  event: APIGatewayEvent,
): Promise<IStandardResponseFormat> => {
  try {
    const { USER_POOL_ID, USER_POOL_CLIENT_ID, error } = validateEnvs([
      "USER_POOL_ID",
      "USER_POOL_CLIENT_ID",
    ]);
    if (error) {
      return standardResponseFormat(500, error);
    }

    if (!event.body) {
      return standardResponseFormat(
        500,
        "Parâmetros de entrada não informados",
      );
    }
    const request = JSON.parse(event.body) as ILogin;
    const { login, password } = request;
    if (!login || !login.match(emailRegex)) {
      return standardResponseFormat(400, "Email inválido");
    }
    if (!password || !password.match(passwordRegex)) {
      return standardResponseFormat(400, "Senha inválida");
    }

    if (!password || !login) {
      return standardResponseFormat(400, "Informar login e senha");
    }

    const response = await new CognitoServices(
      USER_POOL_ID,
      USER_POOL_CLIENT_ID,
    ).login(login, password);
    return standardResponseFormat(200, undefined, response);
  } catch (err) {
    console.log("🚀 ~ err:", err);
    return standardResponseFormat(500, "Erro ao fazer o login:" + err);
  }
};
