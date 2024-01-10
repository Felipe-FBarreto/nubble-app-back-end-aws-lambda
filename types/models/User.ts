export type IUser = {
  cognitoId: string;
  name: string;
  email: string;
  avatar?: string;
  followers: number;
  following: Array<string>;
  post: number;
};
