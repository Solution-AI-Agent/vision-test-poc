import AppKit
import AVFoundation
import CoreVideo
import CoreText
let base=URL(fileURLWithPath:CommandLine.arguments[1])
let scratch=base
let W=1280,H=720,fps=24,total=168
let previewOnly=CommandLine.arguments.contains("--preview")
let sampleOnly=CommandLine.arguments.contains("--sample")
let doc=try JSONSerialization.jsonObject(with:Data(contentsOf:base.appendingPathComponent("STORYBOARD.json"))) as! [String:Any]
let scenes=doc["scenes"] as! [[String:Any]]
let mint=NSColor(calibratedRed:0.32,green:0.88,blue:0.78,alpha:1)
let ink=NSColor(calibratedRed:0.91,green:0.95,blue:1,alpha:1)
let amber=NSColor(calibratedRed:1,green:0.71,blue:0.34,alpha:1)
let muted=NSColor(calibratedRed:0.49,green:0.60,blue:0.72,alpha:1)
let cardColor=NSColor(calibratedRed:0.06,green:0.10,blue:0.17,alpha:1)
var textImages:[String:CGImage]=[:]
var overflow=Set<String>()
func text(_ s:String,_ x:CGFloat,_ y:CGFloat,_ width:CGFloat,_ size:CGFloat=26,_ color:NSColor=ink,_ bold:Bool=false,_ height:CGFloat=80) {
    let p=NSMutableParagraphStyle(); p.lineSpacing=4; p.lineBreakMode = .byWordWrapping
    let a=NSAttributedString(string:s,attributes:[.font:NSFont.systemFont(ofSize:size,weight:bold ? .semibold : .regular),.foregroundColor:color,.paragraphStyle:p])
    let bounds=a.boundingRect(with:NSSize(width:width,height:1000),options:[.usesLineFragmentOrigin,.usesFontLeading])
    if bounds.height > height+3 { overflow.insert(s) }
    // Rasterize each distinct label once, then composite its CGImage. This avoids
    // repeated offscreen font-cache glyph loss during thousands of video frames.
    let key="\(s)|\(width)|\(size)|\(bold)|\(height)|\(color)"
    let cached:CGImage
    if let im=textImages[key] {cached=im} else {
        let w=Int(ceil(width)),h=Int(ceil(height))
        let paint=CGContext(data:nil,width:w,height:h,bitsPerComponent:8,bytesPerRow:w*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
        let font=NSFont.systemFont(ofSize:size,weight:bold ? .semibold : .regular)
        let ctfont=CTFontCreateWithName(font.fontName as CFString,size,nil)
        let ct=NSMutableAttributedString(attributedString:a)
        ct.addAttributes([NSAttributedString.Key(kCTFontAttributeName as String):ctfont,NSAttributedString.Key(kCTForegroundColorAttributeName as String):color.cgColor],range:NSRange(location:0,length:ct.length))
        let setter=CTFramesetterCreateWithAttributedString(ct as CFAttributedString)
        let path=CGPath(rect:CGRect(x:0,y:0,width:width,height:height),transform:nil)
        CTFrameDraw(CTFramesetterCreateFrame(setter,CFRange(location:0,length:0),path,nil),paint)
        cached=paint.makeImage()!;textImages[key]=cached
    }
    let ctx=NSGraphicsContext.current!.cgContext
    ctx.saveGState();ctx.translateBy(x:x,y:y+height);ctx.scaleBy(x:1,y:-1)
    ctx.draw(cached,in:CGRect(x:0,y:0,width:width,height:height));ctx.restoreGState()

}
func box(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ color:NSColor=cardColor,_ stroke:NSColor?=nil) {
    let p=NSBezierPath(roundedRect:NSRect(x:x,y:y,width:w,height:h),xRadius:16,yRadius:16)
    color.setFill(); p.fill()
    if let s=stroke { s.setStroke();p.lineWidth=2;p.stroke() }
}
func line(_ a:CGPoint,_ b:CGPoint,_ color:NSColor=mint,_ width:CGFloat=3,_ dashed:Bool=false) {
 let p=NSBezierPath();p.move(to:a);p.line(to:b);p.lineWidth=width
 if dashed {p.setLineDash([7,7],count:2,phase:0)}
 color.setStroke();p.stroke()
}
func circle(_ x:CGFloat,_ y:CGFloat,_ r:CGFloat,_ color:NSColor=mint,_ filled:Bool=false) {
 let p=NSBezierPath(ovalIn:NSRect(x:x-r,y:y-r,width:r*2,height:r*2));p.lineWidth=3
 if filled {color.setFill();p.fill()} else {color.setStroke();p.stroke()}
}
func arrow(_ a:CGPoint,_ b:CGPoint,_ color:NSColor=mint) {
 line(a,b,color);let angle=atan2(b.y-a.y,b.x-a.x)
 line(b,CGPoint(x:b.x-14*cos(angle-0.5),y:b.y-14*sin(angle-0.5)),color)
 line(b,CGPoint(x:b.x-14*cos(angle+0.5),y:b.y-14*sin(angle+0.5)),color)
}
func gear(_ x:CGFloat,_ y:CGFloat,_ r:CGFloat=25) {
 circle(x,y,r,mint);circle(x,y,r*0.32,mint)
 for i in 0..<8 {let a=Double(i)*Double.pi/4;line(CGPoint(x:x+r*cos(a),y:y+r*sin(a)),CGPoint(x:x+(r+9)*cos(a),y:y+(r+9)*sin(a)),mint,5)}
}
func window(_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ h:CGFloat,_ label:String="화면") {
 box(x,y,w,h,cardColor,muted.withAlphaComponent(0.4));line(CGPoint(x:x,y:y+38),CGPoint(x:x+w,y:y+38),muted.withAlphaComponent(0.4),1)
 for i in 0..<3 {circle(x+18+CGFloat(i)*15,y+18,3,muted,true)}
 text(label,x+72,y+9,w-88,17,muted,false,28)
}
func note(_ s:String,_ x:CGFloat,_ y:CGFloat,_ w:CGFloat,_ color:NSColor=mint) {text(s,x,y,w,25,color,true,72)}
func smooth(_ x:Double)->Double {let t=max(0,min(1,x));return t*t*(3-2*t)}
func render(_ t:Double)->CVPixelBuffer {
 let idx=min(11,Int(t/14)),s=scenes[idx],u=t-Double(idx*14),p=smooth(u/10)
 var b:CVPixelBuffer?;CVPixelBufferCreate(kCFAllocatorDefault,W,H,kCVPixelFormatType_32ARGB,nil,&b)
 let buffer=b!;CVPixelBufferLockBaseAddress(buffer,[])
 let ctx=CGContext(data:CVPixelBufferGetBaseAddress(buffer),width:W,height:H,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(buffer),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:true)
 ctx.translateBy(x:0,y:CGFloat(H));ctx.scaleBy(x:1,y:-1)
 NSColor(calibratedRed:0.025,green:0.045,blue:0.09,alpha:1).setFill();NSBezierPath(rect:NSRect(x:0,y:0,width:W,height:H)).fill()
 for x in stride(from:40,to:W,by:40) {line(CGPoint(x:x,y:156),CGPoint(x:x,y:600),muted.withAlphaComponent(0.06),1)}
 for y in stride(from:160,to:600,by:40) {line(CGPoint(x:40,y:y),CGPoint(x:1240,y:y),muted.withAlphaComponent(0.06),1)}
 text("VISION AGENT / \(String(format:"%02d",idx+1))",48,22,1000,16,mint,true,26)
 text(s["title"] as! String,48,62,1184,36,ink,true,70)
 switch idx {
 case 0:
  for i in 0..<3 {let x=CGFloat(100+i*350);window(x,230,300,235,["Web","Desktop","Mobile"][i]);gear(x+150,342);note("화면",x+110,406,150)}
  for i in 0..<3 {let x=CGFloat(250+i*350);arrow(CGPoint(x:x,y:185),CGPoint(x:x,y:219),mint)}
  note("목표 → 화면의 의미 → 행동",400,165,720)
  let dotx=180+900*p;circle(dotx,532,8,mint,true);line(CGPoint(x:180,y:532),CGPoint(x:1080,y:532),mint.withAlphaComponent(0.4),2)
  text("‘보이는 것’을 행동의 입력으로",390,550,780,29,ink,true,45)
 case 1:
  box(65,240,390,150);text("목표",90,263,300,22,amber,true,34);text("설정을 열어 주세요",90,309,350,28,ink,true,80)
  window(650,205,530,345,"현재 화면")
  circle(760,355,28,muted);gear(910,355);box(1030,325,75,60,muted.withAlphaComponent(0.2));text("검색",732,424,105,22,muted,false,40);text("설정",885,424,115,22,mint,true,40);text("메뉴",1030,424,110,22,muted,false,40)
  arrow(CGPoint(x:455,y:315),CGPoint(x:650+260*p,y:355),mint)
  if u>3 {circle(910,355,48,mint.withAlphaComponent(CGFloat(smooth((u-3)/3))))}
  note("화면 속 의미를 행동 대상으로 연결",360,560,920)
 case 2:
  window(100,190,760,390,"새 레이아웃")
  let x=250+440*p,y=335+140*p;gear(x,y);circle(250,335,48,muted.withAlphaComponent(0.3))
  line(CGPoint(x:250,y:335),CGPoint(x:x,y:y),mint,2,true)
  arrow(CGPoint(x:460,y:545),CGPoint(x:x,y:y+45),mint)
  note("현재 화면에서\n다시 위치 찾기",940,305,280)
  text("role / label locator도 배치 변화에 대응할 수 있습니다.",100,590,1100,20,muted,false,28)
 case 3:
  let positions=[CGPoint(x:280,y:275),CGPoint(x:970,y:275),CGPoint(x:970,y:510),CGPoint(x:280,y:510)]
  let labels=["관찰 Iₜ","판단 + 목표 g","행동 aₜ","새 화면 Iₜ₊₁"]
  for i in 0..<4 {let q=positions[i];arrow(q,positions[(i+1)%4],mint.withAlphaComponent(0.55));box(q.x-118,q.y-44,236,88);text(labels[i],q.x-98,q.y-16,205,26,ink,true,60)}
  let v=(u/3).truncatingRemainder(dividingBy:4);let k=Int(v),f=v-Double(k),a=positions[k],z=positions[(k+1)%4]
  circle(a.x+(z.x-a.x)*f,a.y+(z.y-a.y)*f,9,amber,true)
  text("다음 선택의 입력은 ‘새 화면’",410,374,550,27,mint,true,48)
 case 4:
  let nodes=[CGPoint(x:140,y:365),CGPoint(x:500,y:365),CGPoint(x:1110,y:365)]
  arrow(nodes[0],nodes[1],muted);arrow(nodes[1],nodes[2],muted.withAlphaComponent(0.25))
  note("목표",90,280,170);note("현재 화면",390,275,230);note("계속 진행",1010,280,240)
  box(550,305,340,155,cardColor,amber);text("대화상자 등장",580,341,280,25,amber,true,40);text("새 관찰 필요",580,387,280,21,muted,false,36)
  if u>3 {let q=CGPoint(x:755,y:530);arrow(nodes[1],q,mint);arrow(q,nodes[2],mint);note("닫기 / 대기 / 확인 요청",560,552,600)}
 case 5:
  window(90,210,610,335,"Canvas / 이미지 중심 인터페이스")
  for i in 0..<3 {let x=CGFloat(230+i*165);if i==1 {gear(x,352,34)}else{circle(x,352,32,muted);line(CGPoint(x:x-18,y:355),CGPoint(x:x+18,y:355),muted)}}
  let scanx=100+580*p;line(CGPoint(x:scanx,y:256),CGPoint(x:scanx,y:530),mint.withAlphaComponent(0.55),2)
  arrow(CGPoint(x:770,y:370),CGPoint(x:435,y:370),mint)
  note("모양 + 위치 + 맥락",820,285,370)
  text("시각 단서로 대상 선택\n작은 글자·유사 아이콘은 오판 가능",820,390,355,24,ink,false,140)
 case 6:
  window(130,200,670,365,"현재 설정 화면")
  text("집중 모드",175,300,360,30,ink,true,60)
  let on=u>5
  box(550,294,190,75,on ? mint.withAlphaComponent(0.7) : muted.withAlphaComponent(0.3))
  circle(587+110*p,331,26,ink,true)
  text(on ? "켜짐" : "꺼짐",175,425,340,30,on ? mint : muted,true,60)
  arrow(CGPoint(x:825,y:332),CGPoint(x:910,y:332),mint)
  note("선택 표시와\n현재 상태 확인",930,287,280)
  text("화면에 드러난 상태를 다음 선택의 입력으로",230,585,1000,24,mint,true,36)
 case 7:
  box(80,205,490,120);text("목표: 노란 메모 오른쪽 폴더",105,240,440,25,ink,true,65)
  box(215,390,120,110,amber.withAlphaComponent(0.8))
  text("메모",235,428,110,22,ink,true,38)
  let fx=560+200*p
  box(fx,373,150,126,mint.withAlphaComponent(0.25),mint);box(fx,357,65,24,mint.withAlphaComponent(0.5))
  text("폴더",fx+35,425,130,23,mint,true,40)
  box(900,214,150,126,muted.withAlphaComponent(0.2),muted);text("폴더",925,257,130,23,muted,true,40)
  arrow(CGPoint(x:350,y:435),CGPoint(x:fx-16,y:435),mint)
  text("오른쪽 관계",375,467,300,23,mint,true,45)
  text("같은 모양도 주변 관계로 구분",380,570,850,28,mint,true,46)
 case 8:
  let xs:[CGFloat]=[70,450,830]
  for i in 0..<3 {let x=xs[i];window(x,220,300,230,["Web","Desktop","Mobile"][i]);gear(x+150,345);arrow(CGPoint(x:x+150,y:450),CGPoint(x:640,y:545),mint.withAlphaComponent(0.6))}
  box(445,514,390,77);text("공통 입력: 화면",485,538,325,27,mint,true,44)
  text("실행 도구는 환경별로: 클릭 / 터치 / 키 입력",320,174,900,24,amber,true,40)
 case 9:
  let labels=["행동 요청","도구 완료","관찰된 변화"]
  for i in 0..<3 {let x=CGFloat(70+i*410);let active=u>Double(i)*3;box(x,290,330,135,cardColor,active ? mint : muted);text(labels[i],x+30,329,285,29,active ? mint : muted,true,60);if i<2 {arrow(CGPoint(x:x+340,y:358),CGPoint(x:x+400,y:358),muted)}}
  note("화면 전후 변화 + 목표 충족 근거",310,510,900)
  text("예시: 테마 변경 요청 → 실행 → 실제 화면 색상 확인",220,210,1040,25,ink,false,52)
 case 10:
  circle(445,370,175,mint.withAlphaComponent(0.65));circle(815,370,175,NSColor.systemBlue.withAlphaComponent(0.75))
  text("DOM / API",335,308,230,30,mint,true,46);text("정확한 값\n명시적 계약\n반복 검증",350,376,250,25,ink,false,150)
  text("Vision",740,308,230,30,NSColor.systemBlue,true,46);text("현재 화면\n관계와 맥락\n자연어 검토",750,376,260,25,ink,false,150)
  arrow(CGPoint(x:615,y:365),CGPoint(x:665,y:365),amber)
  text("Playwright screenshot 비교도 시각 검증의 한 방식",225,590,1030,22,muted,false,30)
 case 11:
  let a=CGPoint(x:190,y:365),b=CGPoint(x:630,y:365),c=CGPoint(x:1070,y:265),d=CGPoint(x:1070,y:495)
  arrow(a,b,mint);arrow(b,c,mint);arrow(b,d,amber)
  box(65,315,250,100);text("화면 관찰",95,343,210,27,ink,true,55)
  box(500,315,260,100);text("근거 확인",530,343,230,27,ink,true,55)
  box(925,215,280,100);text("목표 충족 확인",950,244,245,25,mint,true,50)
  box(925,445,280,100);text("불확실 → 확인 요청",950,474,245,23,amber,true,55)
  let dot=CGPoint(x:330+140*p,y:a.y);circle(dot.x,dot.y,9,mint,true)
  text("화면 이해 · 변화에 따른 선택 · 결과 확인",280,563,1000,28,mint,true,50)
 default:break
 }
 let caps=s["captions"] as! [String]
 box(30,626,1220,68,NSColor(calibratedRed:0.055,green:0.085,blue:0.15,alpha:1))
 text(caps[min(1,Int(u/7))],50,640,1180,23,ink,false,52)
 text("개념 애니메이션 · 실제 모델 실행 아님 · 실험 자료 미포함",48,701,1050,13,muted,false,18)
 mint.setFill();NSBezierPath(rect:NSRect(x:0,y:717,width:CGFloat(t/168)*1280,height:3)).fill()
 NSGraphicsContext.restoreGraphicsState();CVPixelBufferUnlockBaseAddress(buffer,[]);return buffer
}
func savePNG(_ b:CVPixelBuffer,_ url:URL) {
    CVPixelBufferLockBaseAddress(b,[])
    let ctx=CGContext(data:CVPixelBufferGetBaseAddress(b),width:W,height:H,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(b),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
    let rep=NSBitmapImageRep(cgImage:ctx.makeImage()!)
    try! rep.representation(using:.png,properties:[:])!.write(to:url)
    CVPixelBufferUnlockBaseAddress(b,[])
}
try FileManager.default.createDirectory(at:scratch,withIntermediateDirectories:true)
for (i,s) in scenes.enumerated() {
    let t=Double(s["start"] as! Int)+Double(s["duration"] as! Int)/2
    savePNG(render(t),base.appendingPathComponent("PREVIEWS").appendingPathComponent(String(format:"SCENE_%02d.png",i+1)))
}
if previewOnly { print("PREVIEW",scenes.count,"frames; text overflow:",overflow);exit(overflow.isEmpty ? 0 : 1) }
let output=sampleOnly ? scratch.appendingPathComponent("REPRESENTATIVE.mp4") : base.appendingPathComponent("VISION_AGENT_CONCEPT_V1_R2.mp4")
if FileManager.default.fileExists(atPath:output.path) { fatalError("Refusing to overwrite existing video") }
let writer=try AVAssetWriter(outputURL:output,fileType:.mp4)
writer.shouldOptimizeForNetworkUse=true
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:W,AVVideoHeightKey:H,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:3_000_000,AVVideoMaxKeyFrameIntervalKey:fps*2,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel]])
input.expectsMediaDataInRealTime=false
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:W,kCVPixelBufferHeightKey as String:H])
writer.add(input);guard writer.startWriting() else { fatalError("Writer: \(String(describing:writer.error))") }
writer.startSession(atSourceTime:.zero)
let renderSeconds = total
let timeOffset = 0.0
for frame in 0..<(renderSeconds*fps) {
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval:0.005); if writer.status == .failed {fatalError("\(writer.error!)")} }
    autoreleasepool {
        let b=render(timeOffset+Double(frame)/Double(fps))
        if !adaptor.append(b,withPresentationTime:CMTime(value:Int64(frame),timescale:Int32(fps))) { fatalError("append \(String(describing:writer.error))") }
    }
    if frame % (fps*10)==0 {print("RENDER",frame/fps,"/",total);fflush(stdout)}
}
input.markAsFinished();let done=DispatchSemaphore(value:0);writer.finishWriting {done.signal()};done.wait()
guard writer.status == .completed else {fatalError("\(String(describing:writer.error))")}
print("COMPLETE",output.path,"text overflow",overflow)
if !overflow.isEmpty {exit(1)}
