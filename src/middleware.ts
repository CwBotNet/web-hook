import { createFactory } from "hono/factory";
import { generateOAuth2AuthLink, loginWithOauth2 } from "./twitter";
import { storeTokenInNotion } from "./notion";
import { generateCodeChallenge, generateCodeVerifier } from "./helper/utils";

const factory = createFactory();
const healthCheckHandler = factory.createHandlers(async (c) => {
  console.log(c.env.GIT_WEB_HOOK_SECRET);
  const { state_kv, codeVerifier_kv } = c.env;
  //   const state = await c.env.state_kv.get("state");
  //   const codeVerifier = await c.env.codeVerifier_kv.get("Verifier");
  //   console.log({ state, codeVerifier });
  return c.text("Hello hone!");
});

const xSetupHandler = factory.createHandlers(async (c) => {
  const verifier = generateCodeVerifier();
  const state = crypto.randomUUID();
  const challenge = await generateCodeChallenge(verifier);
  const { REDIRECT_URI, CLIENT_ID, codeVerifire_kv, state_kv } = c.env;
  const { url } = await generateOAuth2AuthLink({
    callbackUrl: REDIRECT_URI,
    state: state,
    codeChallenge: challenge,
    code_challenge_method: "S256",
    scope: "tweet.read users.read follows.read follows.write",
    clientId: CLIENT_ID,
  });

  // save verifier and state in KV storage
  await codeVerifire_kv.put("Verifier", verifier);
  await state_kv.put("state", state);
  console.log(url);
  return c.redirect(url);
});

const XCallbackHandler = factory.createHandlers(async (c) => {
  const { code, state }: any = c.req.query;
  const {
    TWITTER_API_BASE,
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    state_kv,
    codeVerifire_kv,
  } = c.env;
  const storedState = await state_kv.get("state");
  console.log(storedState);
  if (storedState !== state) {
    console.log(state);
    return c.json({ error: "Invalid or expired state" }, 400);
  }

  const storedCodeVerifier: any = await codeVerifire_kv.get("Verifier");

  // const tokenResponse = await fetch(`${TWITTER_API_BASE}/2/oauth2/token`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //   body: new URLSearchParams({
  //     code,
  //     grant_type: "authorization_code",
  //     client_id: CLIENT_ID,
  //     redirect_uri: REDIRECT_URI,
  //     code_verifier: storedCodeVerifier,
  //   }),
  // });

  // if (!tokenResponse.ok) {
  //   return c.json({ error: "Failed to fetch token" }, 500);
  // }
  // const tokenData: any = await tokenResponse.json();
  const token: any = await loginWithOauth2({
    code,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    codeVerifier: storedCodeVerifier,
    redirectUri: REDIRECT_URI,
  });
  await storeTokenInNotion(token);
  console.log("callback route");
  if (!token) return c.status(401);
  return c.json(token);
});

const twitterOauth2CallbackHandler = factory.createHandlers(async (c) => {
  const { code, state } = c.req.query();

  const storedState = await c.env.state.get("state");
  // if the state is not the same as the stored state then return unauthorized
  if (state !== storedState) {
    return c.status(401);
  }

  const storedCodeVerifier = await c.env.codeVerifier.get("Verifier");

  const { accessToken, refreshToken } = await loginWithOauth2({
    code: code,
    codeVerifier: storedCodeVerifier,
    redirectUri: c.env.TWITTER_CALLBACK_URL,
    clientId: c.env.TWITTER_CLIENT_API_KEY,
    clientSecret: c.env.TWITTER_CLIENT_SECRET,
  });

  if (!accessToken || !refreshToken) return c.status(401);

  await c.env.access_token.put("access_token", accessToken);
  await c.env.refresh_token.put("refresh_token", refreshToken);

  return c.json({ message: "Twitter Setup is complete." });
});

const webHookHandler = factory.createHandlers(async (c) => {});

export {
  healthCheckHandler,
  xSetupHandler,
  XCallbackHandler,
  webHookHandler,
  twitterOauth2CallbackHandler,
};
