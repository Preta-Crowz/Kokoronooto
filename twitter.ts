import { OAuth2Client } from "https://deno.land/x/oauth2_client/mod.ts";
import { OAUTH } from "./const.ts";

export const TWITTER = new OAuth2Client(OAUTH);