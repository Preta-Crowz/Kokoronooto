import { TWITCONF } from "./config.ts";

export const ANY = { $ne: null };
export const OAUTH = {
  clientId: TWITCONF.consumer_id,
  clientSecret: TWITCONF.consumer_secret,
  authorizationEndpointUri: "https://twitter.com/oauth/authorize",
  tokenUri: "https://twitter.com/oauth/access_token",
  redirectUri: TWITCONF.callback,
  defaults: {
    scope: "read:user",
  },
};