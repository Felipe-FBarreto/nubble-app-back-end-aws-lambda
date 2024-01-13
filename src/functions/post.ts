import { IComments } from "./../types/post/IComments";
import { S3Services } from "./../services/S2Services";
import { UserModel } from "./../models/UserModel";
import { getUserIdFromEvent } from "./../utils/authenticateUse";
import { imageAllowedExtensions } from "./../contents/Regexes";
import { validateEnvs } from "./../utils/validateEnvs";
import { Handler, APIGatewayEvent } from "aws-lambda";
import {
  IStandardResponseFormat,
  standardResponseFormat,
} from "../utils/standardResponseFormat";
import { parse } from "aws-multipart-parser";
import { EventPostResquest, IPost } from "../types/models/Post";
import * as Uuid from "uuid";
import { PostModel } from "../models/PostModel";
export const post: Handler = async (
  event: APIGatewayEvent,
): Promise<IStandardResponseFormat> => {
  try {
    const { error, POST_BUCKET } = validateEnvs(["POST_TABLE", "POST_BUCKET"]);
    if (error) {
      return standardResponseFormat(500, error);
    }
    if (!event.body) {
      return standardResponseFormat(400, "Parâmetros de entradas necessários");
    }
    const userId = getUserIdFromEvent(event);

    const user = await UserModel.get({ cognitoId: userId });
    if (!user) {
      return standardResponseFormat(400, "Usuário não encontrado");
    }
    const { file, description } = parse(
      event,
      true,
    ) as unknown as EventPostResquest;

    if (!description || description.length < 3) {
      return standardResponseFormat(400, "Descrição inválida");
    }

    if (!file || !imageAllowedExtensions.exec(file.filename)) {
      return standardResponseFormat(400, "Extensão do arquivo inválida");
    }
    const imageKey = await new S3Services().saveImageS3(
      POST_BUCKET,
      "post",
      file,
    );
    const dateCurrent = new Date();
    const post: IPost = {
      id: Uuid.v4(),
      date: dateCurrent.toString(),
      userId,
      description,
      image: imageKey,
    };
    await PostModel.create(post);
    user.post += 1;
    await UserModel.update(user);
    return standardResponseFormat(200, "Publicação realizado com sucesso");
  } catch (err) {
    console.log(err);
    return standardResponseFormat(
      500,
      "Não foi possível realizar o post da sua publicação",
    );
  }
};

export const toggleLike = async (
  event: any,
): Promise<IStandardResponseFormat> => {
  try {
    const { error } = validateEnvs(["POST_TABLE", "POST_BUCKET"]);
    if (error) {
      return standardResponseFormat(500, error);
    }
    const userId = getUserIdFromEvent(event);
    const user = await UserModel.get({ cognitoId: userId });
    const { postId } = event.pathParameters;
    if (!postId) {
      return standardResponseFormat(400, "Parâmetro da url necessário");
    }
    const post = await PostModel.get({ id: postId });
    if (!post) {
      return standardResponseFormat(400, "Publicação não encontrada");
    }

    const hasIndex = post.likes.findIndex((index) => index === user.cognitoId);

    if (hasIndex != -1) {
      post.likes.splice(hasIndex, 1);
      await PostModel.update(post);
      return standardResponseFormat(
        200,
        "Você não esta mais curtindo esse post",
      );
    } else {
      post.likes.push(user.cognitoId);
      await PostModel.update(post);
      return standardResponseFormat(200, "Publicação curtida com sucesso");
    }
  } catch (err) {
    console.log(err);
    return standardResponseFormat(
      500,
      "Não foi possível curtir/ deixar de curtir essa publicação",
    );
  }
};

export const comments: Handler = async (
  event: any,
): Promise<IStandardResponseFormat> => {
  try {
    const { error } = validateEnvs(["POST_TABLE", "POST_BUCKET"]);

    if (error) {
      return standardResponseFormat(500, error);
    }
    const userId = getUserIdFromEvent(event);

    const user = await UserModel.get({ cognitoId: userId });

    if (!user) {
      return standardResponseFormat(400, "Usuário não encontrado");
    }
    const { postId } = event.pathParameters;

    if (!postId) {
      console.log(postId);
      return standardResponseFormat(400, "Paramentro da url inválido");
    }

    const post = await PostModel.get({ id: postId });
    if (!post) {
      return standardResponseFormat(400, "Publicação não encontrado");
    }

    if (!event.body) {
      return standardResponseFormat(400, "Parâmetros de entrada necessário");
    }
    const { comments } = JSON.parse(event.body) as IComments;

    if (!comments || comments.length < 3) {
      return standardResponseFormat(400, "Comentário inválido");
    }
    const currentDate = new Date();
    const comment = {
      date: currentDate.toString(),
      userId,
      comments,
    };
    post.comments.push(comment);
    await PostModel.update(post);
    return standardResponseFormat(200, "Comentário adicionado com sucesso");
  } catch (err) {
    console.log(err);
    return standardResponseFormat(
      500,
      "Não foi possível comentar está publicação",
    );
  }
};

export const get: Handler = async (
  event: any,
): Promise<IStandardResponseFormat> => {
  try {
    const { error, POST_BUCKET } = validateEnvs(["POST_BUCKET"]);

    if (error) {
      return standardResponseFormat(500, error);
    }

    const { postId } = event.pathParameters;

    if (!postId) {
      console.log(postId);
      return standardResponseFormat(400, "Paramentro da url inválido");
    }

    const post = await PostModel.get({ id: postId });
    if (!post) {
      return standardResponseFormat(400, "Publicação não encontrado");
    }

    post.image = await new S3Services().getImageS3(POST_BUCKET, post.image);
    return standardResponseFormat(200, undefined, post);
  } catch (err) {
    console.log(err);
    return standardResponseFormat(500, "Não foi possível bucar publicação");
  }
};
