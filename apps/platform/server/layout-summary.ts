import type {Run} from "./domain";
export function layoutSummary(run:Run){
 if(!run.settings.layoutAssist)return '웹 겹침 보조 검사 꺼짐';
 if(!run.layoutAudits?.length)return '혼합 겹침 검사 미실행';
 const incomplete=run.layoutAudits.some(a=>!a.stable||a.reason||a.warnings.length||a.candidates.length&&!a.review);
 const candidates=run.findings.filter(f=>f.layout&&f.status!=='false-positive').length;
 return `혼합 겹침 검사 · ${candidates?`의심 ${candidates}건 · 검토 필요`:'검사 범위 내 후보 없음'}${incomplete?' · 미완료/범위 제한 있음':''}`;
}
