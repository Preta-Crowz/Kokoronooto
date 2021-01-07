import { DB } from "../db.ts";
export interface schema {
    twitter_id: number;
    display_name: string;
    display_id: string;
    profile: string;
    created: Date;
    url: string;
    protect: number;
}
const collection = DB.collection<schema>("user");
export default collection;