import { FileData } from "aws-multipart-parser/dist/models";

export type IUserUpdated = {
  name?: string;
  file?: FileData;
};
