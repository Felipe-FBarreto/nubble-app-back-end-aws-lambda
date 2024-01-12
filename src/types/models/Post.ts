import { FileData } from "aws-multipart-parser/dist/models";
export type IPost = {
  id: string;
  date: string;
  userId: string;
  description: string;
  image: string;
  comments?: Array<string>;
  likes?: Array<string>;
};

export type EventPostResquest = {
  description: string;
  file: FileData;
};
