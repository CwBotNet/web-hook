const TwitterApi = require("twitter-api-v2");
import { env } from "hono/adapter";

const clinet = new TwitterApi({
  appKey: env<{ TWITTER_CONSUMER_KEY: String }>,
  appSecret: env<{ TWITTER_CONSUMER_SECRET: String }>,
  accessToken: env<{ TWITTER_ACCESS_TOKEN: String }>,
  accessSecret: env<{ TWITTER_ACCESS_TOKEN_SECRET: string }>,
});

export { clinet };
