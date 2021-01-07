import { DB } from "../db.ts";
export interface schema {
    from: number;
    to: number;
    type: string;
    question: string;
    answer: string;
    status: number;
}
const collection = DB.collection<schema>("ask");
export default collection;