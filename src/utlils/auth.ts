import { Hono } from "hono";
import { env } from "hono/adapter";

const consumerKey = env<{ TWITTER_CONSUMER_KEY: String }>;

const consumerSecret = env<{ TWITTER_CONSUMER_SECRET: String }>;
const accessToken = env<{ TWITTER_ACCESS_TOKEN: String }>;
const accessSecret = env<{ TWITTER_ACCESS_TOKEN_SECRET: string }>;

const createAuthHeader = () => {
  const token = btoa(`${consumerKey}:${consumerSecret}`);
  console.log(token);
  return `Basic ${token}`;
};

const getBearerToken = async () => {
  const response = await fetch("https://api.twitter.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: createAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: "grant_type=client_credentials",
  });
  const data: any = await response.json();
  return data.access_token;
};

const fetchTwitterData = async (url: string) => {
  const token = await getBearerToken();
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return await response.json();
};

export { fetchTwitterData };
