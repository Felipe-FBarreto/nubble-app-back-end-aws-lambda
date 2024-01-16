export type IUser = {
  cognitoId: string;
  name: string;
  email: string;
  avatar?: string;
  followers: Array<string>;
  following: Array<string>;
  post: number;
};
