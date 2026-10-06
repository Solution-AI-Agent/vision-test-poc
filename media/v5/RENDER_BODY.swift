func cropShot(_ path:String,_ source:NSRect,_ dest:NSRect){
 let im=image(path);let ratio=min(dest.width/source.width,dest.height/source.height)
 let r=NSRect(x:dest.minX+(dest.width-source.width*ratio)/2,y:dest.minY+(dest.height-source.height*ratio)/2,width:source.width*ratio,height:source.height*ratio)
 im.draw(in:r,from:NSRect(x:source.minX,y:im.size.height-source.maxY,width:source.width,height:source.height),operation:.sourceOver,fraction:1,respectFlipped:true,hints:[.interpolation:NSImageInterpolation.high])
}
func receiptPair(){
 text("정상 · 실제 모델 입력",48,174,560,26,mint,true,45)
 text("결함 · 실제 모델 입력",672,174,560,26,amber,true,45)
 let source=NSRect(x:697,y:224,width:470,height:465)
 cropShot("normal.jpg",source,NSRect(x:48,y:227,width:560,height:341))
 cropShot("fault.jpg",source,NSRect(x:672,y:227,width:560,height:341))
}
func render(_ t:Double)->CVPixelBuffer {
 let i=scenes.lastIndex(where:{Double($0["start"] as! Int)<=t})!
 let s=scenes[i],local=t-Double(s["start"] as! Int),duration=Double(s["duration"] as! Int)
 let kind=s["kind"] as! String
 var buffer:CVPixelBuffer?
 CVPixelBufferCreate(kCFAllocatorDefault,W,H,kCVPixelFormatType_32ARGB,[kCVPixelBufferCGImageCompatibilityKey:true,kCVPixelBufferCGBitmapContextCompatibilityKey:true] as CFDictionary,&buffer)
 let b=buffer!;CVPixelBufferLockBaseAddress(b,[])
 let ctx=CGContext(data:CVPixelBufferGetBaseAddress(b),width:W,height:H,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(b),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
 ctx.translateBy(x:0,y:CGFloat(H));ctx.scaleBy(x:1,y:-1)
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:true)
 NSColor(calibratedRed:0.025,green:0.055,blue:0.07,alpha:1).setFill();NSRect(x:0,y:0,width:W,height:H).fill()
 text(s["title"] as! String,48,45,1184,37,ink,true,65)
 text(s["kicker"] as! String,48,113,1184,20,muted,false,38)
 switch kind {
 case "fault":
  let z=max(0,min(1,(local-1.5)/2));let q=CGFloat(z*z*(3-2*z))
  let source=NSRect(x:697*q,y:224*q,width:1280+(470-1280)*q,height:720+(465-720)*q)
  cropShot("fault.jpg",source,NSRect(x:48,y:168,width:760,height:427))
  side(["주문 완료","큰 빈 패널이 화면을 가림","영수증 내용을 읽을 수 없음","실제 입력 1280×720"],amber)
 case "dom":
  shot("fault.jpg");side(["동일 실행 원장 발췌","domSuite: PASS","run: ae75c703…","기능 검증 결과"],mint)
 case "issue":
  cropShot("fault.jpg",NSRect(x:697,y:224,width:470,height:465),NSRect(x:48,y:174,width:530,height:415))
  box(625,176,607,110);text("location · 원문",647,190,563,19,muted,false,35)
  text("Your receipt section",647,233,563,28,amber,true,55)
  box(625,306,607,252);text("reason · 원문",647,322,563,19,muted,false,35)
  text("The receipt details are obscured by a large dark green overlay, making it impossible to read item labels, amounts, or the total.",647,368,563,24,ink,false,172)
  text("모델: candidate · 독립 확인: 영수증 가림",625,574,607,21,mint,true,37)
 case "normal":
  shot("normal.jpg");side(["같은 기준의 정상 대조","모델 status: pass","읽을 수 있는 영수증","run: b7181596…"],mint)
 case "scope":
  for j in 0..<2 {
   let x:CGFloat=48+CGFloat(j)*610;box(x,192,574,350)
   text(j==0 ? "DOM/기능 assertion":"시각적 수락 기준",x+26,220,522,30,mint,true,60)
   text(j==0 ? "주문 완료 · 수신자\n상품·수량·명세·의미 총액\n안내 문구 · 요소 가시성":"현재 화면에서\n영수증 내용을 읽을 수 있는가\n가린 영역과 이유는 무엇인가",x+26,323,522,27,ink,false,152)
  }
  text("동일 업무에서 서로 다른 검증 정보를 확인합니다.",60,563,1160,24,muted,false,45)
 case "toggle":
  let files=["ui-normal-before.png","ui-normal-confirmed.png","ui-fault-before.png","ui-fault-confirmed.png"]
  let steps=["① 정상 선택 → 주문 준비","② Confirm order → 정상 완료","③ 렌더링 결함 선택","④ Confirm order → 가림 화면"]
  let n=min(3,Int(local/3))
  cropShot(files[n],NSRect(x:128,y:177,width:976,height:860),NSRect(x:48,y:170,width:748,height:427))
  side([steps[n],"실제 UI 캡처 순서 편집","전환은 모델 호출 없음","저장된 실제 판정 표시"],n<2 ? mint:amber)
  cropShot(files[n],NSRect(x:126,y:179,width:420,height:76),NSRect(x:830,y:540,width:390,height:70))
 case "evidence":
  if local<6 {
   cropShot("ui-normal-confirmed.png",NSRect(x:1130,y:521,width:343,height:245),NSRect(x:48,y:180,width:610,height:416))
   box(700,188,532,356);text("해당 실행의 실제 근거",726,217,480,29,mint,true,64)
   text("실제 입력 이미지\n원응답/로그\n\n정상·결함 링크 모두 HTTP 200",726,320,480,27,ink,false,188)
  }else{
   shot("ui-fault-input-link.png");side(["실제 입력 이미지 링크 열기","해당 결함 run의 원본","브라우저 표시 캡처","정확한 JPEG는 별도 보존"],mint)
  }
 case "assertion":
  let labels=["의미 총액 문자열","안내 DOM 문구와 가시성","영수증 요소 가시성"]
  let code=["await expect(page.getByTestId(\"semantic-total\")).toHaveText(\"$48.00\");","await expect(page.getByTestId(\"delivery\")).toBeVisible();","await expect(page.getByRole(\"img\", { name: \"Receipt: total $48.00\" })).toBeVisible();"]
  for j in 0..<3 {let y:CGFloat=175+CGFloat(j)*135;box(48,y,1184,117);text(labels[j],70,y+12,1140,19,mint,true,35);text(code[j],70,y+53,1140,24,ink,false,66)}
  text("전체 suite에는 수신자·상품·수량·명세 및 안내 toHaveText도 포함됩니다.",60,590,1158,18,muted,false,27)
 case "loop":
  let labels=["현재 화면\n1280×720","공통 가독성\n자연어 기준","모델의 직접\n화면 판단","위치·이유\n증거 대조"]
  let active=min(3,Int(local/3))
  for j in 0..<4 {let x:CGFloat=48+CGFloat(j)*308;box(x,235,260,223,cardColor,j==active ? mint:nil);text(String(format:"%02d",j+1),x+22,257,216,26,mint,true,50);text(labels[j],x+22,331,216,25,ink,true,105);if j<3{text("→",x+270,328,35,30,mint,true,60)}}
  text("DOM · 정답 · 이력 · 기준 이미지 미제공",60,513,1160,27,muted,false,52)
  text("등록 가독성 기준의 직접 판단 · 별도 맹검 전사+코드 비교가 아님",60,567,1160,23,amber,false,44)
 case "detail":
  receiptPair()
  text("같은 영역 확대 · 원문 첫 issue: Your receipt section",48,581,1184,22,mint,true,40)
 case "matrix":
  let xs:[CGFloat]=[65,412,718,1010],widths:[CGFloat]=[335,296,280,210]
  let headers=["고정 확인 상태","DOM/기능","Vision 판정","독립 검토"]
  for j in 0..<4{text(headers[j],xs[j],184,widths[j],24,mint,true,43)}
  let rows=[["정상","3/3 PASS","3/3 pass","문제 없음"],["선택한 영수증 가림","3/3 PASS","3/3 candidate","가림 지적 확인"]]
  for r in 0..<2{let y:CGFloat=253+CGFloat(r)*88;box(48,y-12,1184,73);for j in 0..<4{text(rows[r][j],xs[j],y,widths[j],24,r==1 && j>1 ? amber:ink,false,54)}}
  text("고정 확인 6요청 · 응답 보고 비용 $0.00255091",60,472,1160,29,mint,true,58)
  text("qwen/qwen3-vl-30b-a3b-instruct · 실측 코드 373ecad3",60,548,1160,22,muted,false,42)
  text("후보 선정 포함 9요청과 이전 실패는 출처에 별도 기록",60,586,1160,18,muted,false,30)
 case "screenshot", "value":
  box(48,190,534,350);box(632,190,600,350)
  text(kind=="screenshot" ? "정상 기준 screenshot":"자연어 가독성 요구",72,217,486,28,mint,true,76)
  if kind=="screenshot" {
   cropShot("screenshot-reference.png",NSRect(x:697,y:224,width:470,height:465),NSRect(x:86,y:310,width:450,height:212))
  }else{
   text("“사용자가 영수증의\n상품·금액·합계를\n읽을 수 있어야 한다”",76,328,478,29,ink,true,166)
  }
  text("현재 화면",656,217,550,28,ink,true,67)
  cropShot("fault.jpg",NSRect(x:697,y:224,width:470,height:465),NSRect(x:679,y:310,width:505,height:212))
  text("→",586,346,42,32,mint,true,68)
  text(kind=="screenshot" ? "기준 화면 비교도 이 결함을 잡았습니다.":"기준 이미지 없이 기능 PASS 화면의 읽기 문제를 지적했습니다.",60,568,1160,24,kind=="screenshot" ? muted:mint,true,47)
 case "limits":
  lines(["선별한 주입 사례 · 등록 기준 기반 데모","일반 성능 · 완전 자율 발견은 미입증","이전 실패는 출처·부록에 보존","Windows · 모바일 Vision 정확도 미검증"],177,98,amber)
 default:
  if local<10 {
   cropShot("ui-fault-confirmed.png",NSRect(x:125,y:179,width:1360,height:850),NSRect(x:48,y:175,width:760,height:424))
   side(["① 정상/결함 선택","② Confirm order","③ 기능/Vision 결과 확인","④ 실제 입력·원응답 열기"],mint)
  }else{
   text("http://127.0.0.1:4310/demo",80,200,1120,43,mint,true,90)
   text("기능 PASS 화면의 읽기 문제를\n기준 이미지 없이 발견한 작동 데모",80,315,1120,36,ink,true,139)
   box(80,492,1120,96);text("실제 모델 입력 · 원응답 · 독립 검토 근거 제공",108,519,1064,27,muted,false,58)
  }
 }
 box(32,625,1216,69)
 let caps=s["captions"] as! [String]
 let cap=caps[min(caps.count-1,Int(local/duration*Double(caps.count)))]
 text(cap,54,636,1172,24,ink,false,54)
 let sourceLabel = ["fault","dom","issue"].contains(kind) ? "SOURCE ae75c703 · 373ecad3 · 첫 영수증 issue" : (kind=="normal" ? "SOURCE b7181596 · 373ecad3 · 정상 대조" : (["toggle","evidence","end"].contains(kind) ? "SOURCE UI 3163da8 · 캡처 순서 편집 · 저장된 실제 판정" : "SOURCE POC-LEAD working-demo acceptance · 373ecad3"))
 text(sourceLabel,48,697,1070,13,muted,false,18)
 text(String(format:"%02d / %02d",i+1,scenes.count),1152,697,90,13,muted,false,18)
 mint.setFill();NSRect(x:0,y:716,width:CGFloat(t/Double(total))*CGFloat(W),height:4).fill()
 NSGraphicsContext.restoreGraphicsState();CVPixelBufferUnlockBaseAddress(b,[]);return b
}
