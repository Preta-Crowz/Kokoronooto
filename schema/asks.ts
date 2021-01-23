import { DB } from "../db.ts";
export interface schema {
    from: number;
    to: number;
    type: number; // 0 - 익명질문, 1 - 공개질문
    question: string;
    answer: string;
    report: number[]; // 신고한 유저들의 ID 저장, 중복신고 방지용
    status: number; // -1 - 삭제됨, 0 - 보류중, 1 - 답변됨, 2 - 검토중, 3 - 거부됨
}
const collection = DB.collection<schema>("ask");
export default collection;