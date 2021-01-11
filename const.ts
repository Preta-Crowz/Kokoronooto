import { OAuth2Client } from "./deps.ts";
import { TWITCONF } from "./config.ts";
import { Template } from "./template.ts";

export const ANY = { $ne: null };
export const TWITTER = new OAuth2Client({
  clientId: TWITCONF.consumer_id,
  clientSecret: TWITCONF.consumer_secret,
  authorizationEndpointUri: "https://twitter.com/oauth/authorize",
  tokenUri: "https://twitter.com/oauth/access_token",
  redirectUri: TWITCONF.callback,
  defaults: {
    scope: "read:user",
  },
});
export const TEMPLATE = new Map<string, Template>();
TEMPLATE.set("profile", new Template("./template/profile.html"));
TEMPLATE.set("test", new Template("./template/test.html"));