import { MongoClient } from "./deps.ts";
import { DBCONN } from "./config.ts";

export const CLI = new MongoClient();
// await CLI.connect(DBCONN);
await CLI.connectWithUri(DBCONN);

export const DB = CLI.database("kkrn_t");