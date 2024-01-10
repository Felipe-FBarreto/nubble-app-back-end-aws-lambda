import { FileData } from "aws-multipart-parser/dist/models";

export type Register = {
  name: string;
  email: string;
  password: string;
  file?: FileData;
};
