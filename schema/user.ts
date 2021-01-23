import { DB } from "../db.ts";
export interface schema {
    data_id: string, // 사용자 정보 쿼리 ID
    twitter_id: number; // 사용자 내부 ID, 유저 구분할때 사용
    display_name: string; // 사용자 트위터 닉네임, 변경 가능하게 설정할것
    display_id: string; // 사용자 트위터 ID, 로그인시 갱신하도록 할것
    profile: string; // 사용자 프로필 사진, 변경 가능하게 설정할것
    created: Date; // 사용자 가입 일자
    url: string; // 사용자 url, 변경 가능하게 설정할것
    viewLevel: number; // 0 - 전체, 1 - 로그인,  2 - 팔로워, 3 - 맞팔
    askLevel: number; // 위와 동일함, 아이피 유저를 차단 시도하면 차단 대신 단계가 상승함
    followers: number[]; // 팔로워 목록, 내부 캐싱용
    following: number[]; // 팔로잉 목록, 내부 캐싱용
    block: number[]; // 차단한 사용자 목록
}
const collection = DB.collection<schema>("user");
export default collection;