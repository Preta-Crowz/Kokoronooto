// import { MongoClient } from "https://deno.land/x/mongo@v0.20.1/mod.ts";
import { MongoClient } from "https://deno.land/x/mongo@v0.13.0/mod.ts";
import { DBCONN } from "./config.ts";

export const CLI = new MongoClient();
// await CLI.connect(DBCONN);
await CLI.connectWithUri(DBCONN);

export const DB = CLI.database("kkrn_t");