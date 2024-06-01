import { createFactory } from "hono/factory";
import { generateOAuth2AuthLink, loginWithOauth2 } from "./twitter";
import { storeTokenInNotion } from "./notion";
import { generateCodeChallenge, generateCodeVerifier } from "./helper/utils";
const factory = createFactory();
const healthCheckHandler = factory.createHandlers(async (c) => {
  console.log(c.env.GIT_WEB_HOOK_SECRET);
  const { state_kv, codeVerifire_kv } = await c.env;
  const state = await state_kv.get("state");
  const codeVerifire = await codeVerifire_kv.get("verifier");
  console.log({ state, codeVerifire });
  return c.text("Hello hone!");
});

const xSetupHandler = factory.createHandlers(async (c) => {
  try {
    const verifier: string = generateCodeVerifier();
    const state: string = crypto.randomUUID();
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

    // Save verifier and state in KV storage
    console.log("storing kv values");
    let resCode = await codeVerifire_kv.put("verifier", `${verifier}`);
    let resState = await state_kv.put("state", `${state}`);
    if (!resCode || !resState) {
      console.log({
        resCode,
        resState,
      });
      console.log("failed to store kv values");
    } else {
      console.log("stored kv values");
    }
    // Retrieve and log stored values to verify
    const storedVerifier = await codeVerifire_kv.get("verifier");
    const storedState = await state_kv.get("state");
    console.log({
      url: url,
      codeVerifier: storedVerifier,
      state: storedState,
    });

    return c.redirect(url);
  } catch (error) {
    console.error("Error during setup handler execution:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

const XCallbackHandler = factory.createHandlers(async (c) => {
  try {
    const { code, state } = c.req.query();
    const {
      TWITTER_API_BASE,
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI,
      state_kv,
      codeVerifire_kv,
    } = c.env;

    const storedState = await state_kv.get("state");
    console.log("Stored state:", storedState);

    if (!storedState || storedState !== state) {
      console.log("Received state:", state);
      console.log("Expected state:", storedState);
      return c.json({ error: "Invalid or expired state" }, 400);
    }

    const storedCodeVerifire = await codeVerifire_kv.get("verifier");
    console.log("Stored code verifier:", storedCodeVerifire);

    if (!storedCodeVerifire) {
      return c.json({ error: "Invalid or expired verifier" }, 400);
    }

    const tokenResponse = await fetch(`${TWITTER_API_BASE}/2/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code_verifier: storedCodeVerifire,
      }),
    });

    if (!tokenResponse.ok) {
      return c.json({ error: "Failed to fetch token" }, 500);
    }

    const tokenData: any = await tokenResponse.json();
    await storeTokenInNotion(tokenData);

    console.log("Callback route executed successfully");
    return c.json(tokenData);
  } catch (error) {
    console.error("Error during callback handler execution:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

const twitterOauth2CallbackHandler = factory.createHandlers(async (c) => {
  const { code, state } = c.req.query();
  const storedState = await c.env.state_kv.get("state");
  const storedCodeVerifier = await c.env.codeVerifire_kv.get("Verifire");

  // if the state is not the same as the stored state then return unauthorized
  if (state !== storedState.state || storedCodeVerifier.codeVerifier) {
    console.log({ error: "kv error" });
    return c.status(401);
  }

  const token = await loginWithOauth2({
    code: code,
    codeVerifier: storedCodeVerifier,
    redirectUri: c.env.TWITTER_CALLBACK_URL,
    clientId: c.env.TWITTER_CLIENT_API_KEY,
    clientSecret: c.env.TWITTER_CLIENT_SECRET,
  });

  if (!token) return c.status(401);
  const storeToken: any = {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
  };
  // await c.env.access_token.put("access_token", accessToken);
  // await c.env.refresh_token.put("refresh_token", refreshToken);

  await storeTokenInNotion(storeToken);
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
