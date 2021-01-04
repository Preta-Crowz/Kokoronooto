import { DB } from "../db.ts";
export interface schema {
    cat: string;
    lang: string;
}
export const collection = DB.collection<schema>("test");
export default collection;