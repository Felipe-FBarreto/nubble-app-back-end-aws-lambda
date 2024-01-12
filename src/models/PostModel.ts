import * as dynamoose from "dynamoose";

const PostSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
    },
    date: { type: String },
    userId: {
      type: String,
      index: {
        name: "useridIndex",
        global: true,
        rangeKey: "date",
      },
    },
    description: { type: String },
    image: { type: String },
    comments: { type: Array, default: [] },
    likes: { type: Array, default: [] },
  },
  {
    saveUnknown: true,
  },
);

const postTable = process.env.POST_TABLE || "";
export const PostModel = dynamoose.model(postTable, PostSchema);
