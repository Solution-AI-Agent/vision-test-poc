import type { Action } from "../server/domain";
export const criterionNames: Record<string,string> = {readability:"읽기 어려움",geometry:"구성요소 변형",occlusion:"내용 가림","image-meaning":"이미지·설명 불일치","chart-meaning":"차트·값 불일치"};
export function briefKorean(text: string, fallback: string) {
  const korean=(text.match(/[가-힣]/g)??[]).length;
  const latin=(text.match(/[a-zA-Z]/g)??[]).length;
  if (!korean || korean < latin/2) return fallback;
  return text.length > 150 ? text.slice(0,150)+"…" : text;
}
export function QaText({text,label="관찰"}:{text:string;label?:string}) {
  const summary=briefKorean(text,"외국어 원문을 아래에서 확인할 수 있습니다.");
  return <div className="text-sm"><p><span className="text-muted-foreground">{label}: </span>{summary}</p>{summary!==text && <details className="mt-1 text-xs text-muted-foreground"><summary>{label} 원문 보기</summary><p className="mt-2 whitespace-pre-wrap">{text}</p></details>}</div>;
}
export function actionLabel(action:Action) {
  switch(action.type){
    case "midscene":return action.description;
    case "click":return `화면 클릭 (${action.x}, ${action.y})`;
    case "type":return `입력값을 ‘${action.text.length>40?action.text.slice(0,40)+"…":action.text}’로 변경`;
    case "key":return action.key==="ControlOrMeta+A"?"입력 내용 전체 선택":`${action.key} 키 누르기`;
    case "scroll":return action.delta>0?"화면 아래로 이동":"화면 위로 이동";
    case "wait":return "화면 변화 기다리기";
    case "finish":return "업무 결과 확인 후 종료";
  }
}
