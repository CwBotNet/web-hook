import { Hono } from "hono";
import { base64UrlEncode, sha256 } from "./helper/utils";
import { storeTokenInNotion } from "./notion";
import { env } from "hono/adapter";
import { generateOAuth2AuthLink } from "./controller/oAuth2.contorller";
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

const generateCodeVerifier = () => {
  const array = new Uint32Array(56 / 2);
  crypto.getRandomValues(array);
  return Array.from(array, (dec) => ("0" + dec.toString(16)).substr(-2)).join(
    ""
  );
};

const generateCodeChallenge = async (verifier: string) => {
  const hashed = await sha256(verifier);
  return base64UrlEncode(hashed);
};

/*------------------root-------------------*/
app.get("/", (c) => {
  console.log(c.env);
  return c.text("Hello Hono!");
});

/*------------------auth-------------------*/

app.get("/oAuth2", async (c) => {
  const verifier = generateCodeVerifier();
  const State = crypto.randomUUID();
  const challenge = await generateCodeChallenge(verifier);
  const { REDIRECT_URI, CLIENT_ID, codeVerifire_kv, state_kv } = c.env;
  const { url } = await generateOAuth2AuthLink({
    callbackUrl: REDIRECT_URI,
    state: State,
    codeChallenge: challenge,
    code_challenge_method: "S256",
    scope: "tweet.read users.read follows.read follows.write",
    clientId: CLIENT_ID,
  });

  // save verifier and state in KV storage
  await codeVerifire_kv.put("Verifier", verifier);
  await state_kv.put("state", State);
  console.log(url);
  return c.redirect(url);
});

app.get("/auth", async (c) => {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = crypto.randomUUID();
  const { CLIENT_ID, TWITTER_API_BASE, REDIRECT_URI } = c.env;
  const { AUTH_KV } = c.env;
  // save verifier and state in KV storage

  await AUTH_KV.put(`verifier-${state}`, verifier, {
    expirationTtl: 300,
  });
  const authUrl = `${TWITTER_API_BASE}/2/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=tweet.read%20users.read%20follows.read%20follows.write&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
  return c.redirect(authUrl);
});

/*------------------callback-------------------*/
app.get("/callback", async (c) => {
  const url = new URL(c.req.url);
  const code: any = url.searchParams.get("code");
  const state: any = url.searchParams.get("state");
  const {
    TWITTER_API_BASE,
    CLIENT_ID,
    REDIRECT_URI,
    state_kv,
    codeVerifire_kv,
  } = c.env;
  const storedState = await state_kv.get("state");

  if (storedState !== state) {
    console.log(state);
    return c.json({ error: "Invalid or expired state" }, 400);
  }

  const storedCodeVerifier: any = await codeVerifire_kv.get("verifier");
  // const { code, state }: any = c.req.query;

  const tokenResponse = await fetch(`${TWITTER_API_BASE}/2/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: storedCodeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    return c.json({ error: "Failed to fetch token" }, 500);
  }
  const tokenData: any = await tokenResponse.json();
  await storeTokenInNotion(tokenData.assess_token);
  console.log("callback route");
  return c.json(tokenData);
});

export default app;
