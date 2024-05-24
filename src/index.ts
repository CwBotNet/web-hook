import { Hono } from "hono";
import { env } from "hono/adapter";
import dotenv from "dotenv";
import { clinet } from "./utlils/client";
import { fetchTwitterData } from "./utlils/auth";
dotenv.config();
const app = new Hono();

app.get("/", async (c) => {
  const { TWITTER_ACCESS_TOKEN } = env<{ TWITTER_ACCESS_TOKEN: string }>(c);
  const { BEARER_TOKEN } = env<{ BEARER_TOKEN: string }>(c);
  // console.log(TWITTER_ACCESS_TOKEN);
  // console.log(BEARER_TOKEN);

  const data = await fetchTwitterData(
    "https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=twitterapi&count=2"
  );
  console.log(
    c.json({
      data: data,
    })
  );
  return c.text("Hello Hono!");
});

export default app;
