import { Hono } from "hono";
import {
  XCallbackHandler,
  healthCheckHandler,
  twitterOauth2CallbackHandler,
  xSetupHandler,
} from "./middleware";
require("dotenv").config();

// Define the environment interface
interface Env {
  AUTH_KV: KVNamespace;
  TWITTER_API_BASE: string;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  REDIRECT_URI: string;
  NOTION_TOKEN: string;
  NOTION_DATABASE_ID: string;
  state_kv: KVNamespace;
  codeVerifire_kv: KVNamespace;
  [key: string]: KVNamespace | string;
}

// Create the Hono app with the environment interface
const app = new Hono<{ Bindings: Env }>();

/*------------------root-------------------*/
app.get("/", ...healthCheckHandler);

/*------------------auth-------------------*/

app.get("/oAuth2", ...xSetupHandler);

// app.get("/auth", async (c) => {
//   // const verifier = generateCodeVerifier();
//   // const challenge = await generateCodeChallenge(verifier);
//   const state = crypto.randomUUID();
//   const { CLIENT_ID, TWITTER_API_BASE, REDIRECT_URI } = c.env;
//   const { AUTH_KV } = c.env;
//   // save verifier and state in KV storage

//   // await AUTH_KV.put(`verifier-${state}`, verifier, {
//     expirationTtl: 300,
//   });
//   console.log(state);
//   const authUrl = `${TWITTER_API_BASE}/2/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=tweet.read%20users.read%20follows.read%20follows.write&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
//   return c.redirect(authUrl);
// });

/*------------------callback-------------------*/
app.get("/callback", ...twitterOauth2CallbackHandler);

export default app;
