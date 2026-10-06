// Rendering utilities adapted from LUMEN V5. V6 script, composition and verification: POC-LEAD.
import AppKit
import AVFoundation
import CoreVideo
import CoreText

// Local-only, deterministic motion explainer. Original screenshots are never retouched.
// Crop/enlarge and animated annotations are editorial overlays, explicitly labeled.
let base = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "OUTBOX/VISION_POC_RECAP_V6").standardizedFileURL
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let artifact = base.appendingPathComponent("ASSETS")
let scratch = root.appendingPathComponent(".scratch/VISION_POC_RECAP_V6")
let W = 1280, H = 720, fps = 24
let data = try Data(contentsOf: base.appendingPathComponent("SCRIPT_STORYBOARD.json"))
let doc = try JSONSerialization.jsonObject(with: data) as! [String:Any]
let scenes = doc["scenes"] as! [[String:Any]]
let total = doc["duration"] as! Int
let previewOnly = CommandLine.arguments.contains("--preview")
let sampleOnly = CommandLine.arguments.contains("--sample")
let mint = NSColor(calibratedRed:0.36,green:0.86,blue:0.72,alpha:1)
let ink = NSColor(calibratedRed:0.89,green:0.95,blue:0.95,alpha:1)
let muted = NSColor(calibratedRed:0.60,green:0.70,blue:0.73,alpha:1)
let amber = NSColor(calibratedRed:1,green:0.70,blue:0.38,alpha:1)
let cardColor = NSColor(calibratedRed:0.055,green:0.105,blue:0.125,alpha:1)
let reg = "044ecb6b-dfb3-4c61-970b-d0dc653f3201"
let latest = "882f0db4-631d-4d35-bb24-b5af2e688930"
let aut = "5739f389-9faa-4528-8979-92e3d968b3ea"
let baseline = "f0b467c9-1aa1-4714-87fc-717ac619514f"
var images:[String:NSImage] = [:]
var overflow = Set<String>()
var textImages: [String:CGImage] = [:]
func image(_ path:String)->NSImage {
    if let im=images[path] { return im }
    let im=NSImage(contentsOf:artifact.appendingPathComponent(path))!
    images[path]=im; return im
}
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
func shot(_ path:String,_ x:CGFloat=48,_ y:CGFloat=166,_ width:CGFloat=760,_ height:CGFloat=427.5) {
    let im=image(path); let ratio=min(width/im.size.width,height/im.size.height)
    let w=im.size.width*ratio,h=im.size.height*ratio
    box(x-3,y-3,width+6,height+6,cardColor)
    im.draw(in:NSRect(x:x+(width-w)/2,y:y+(height-h)/2,width:w,height:h),from:.zero,operation:.sourceOver,fraction:1,respectFlipped:true,hints:[.interpolation:NSImageInterpolation.high])
}
func side(_ items:[String],_ color:NSColor=mint) {
    for (i,item) in items.enumerated() {
        let y:CGFloat=185+CGFloat(i)*87
        box(840,y,392,72)
        text(item,860,y+16,350,22,i==0 ? color : ink,i==0,56)
    }
}
func lines(_ items:[String],_ y:CGFloat=190,_ step:CGFloat=82,_ color:NSColor=mint) {
    for (i,s) in items.enumerated() {
        box(80,y+CGFloat(i)*step,1120,step-14)
        text(s,108,y+CGFloat(i)*step+17,1060,27,i==0 ? color : ink,i==0,52)
    }
}
func cropShot(_ path:String,_ source:NSRect,_ dest:NSRect){
 let im=image(path);let ratio=min(dest.width/source.width,dest.height/source.height)
 let r=NSRect(x:dest.minX+(dest.width-source.width*ratio)/2,y:dest.minY+(dest.height-source.height*ratio)/2,width:source.width*ratio,height:source.height*ratio)
 im.draw(in:r,from:NSRect(x:source.minX,y:im.size.height-source.maxY,width:source.width,height:source.height),operation:.sourceOver,fraction:1,respectFlipped:true,hints:[.interpolation:NSImageInterpolation.high])
}

let clips = URL(fileURLWithPath: ProcessInfo.processInfo.environment["VISION_CLIP_DIR"] ?? root.appendingPathComponent(".scratch/VISION_V6_CLIPS").path)
var lastFramePath="", lastFrame:NSImage?=nil
func clip(_ name:String,_ local:Double,_ speed:Double,_ count:Int,_ source:NSRect,_ dest:NSRect) {
 let n=min(count,max(1,Int(local*speed*6)+1))
 let path=clips.appendingPathComponent(name).appendingPathComponent(String(format:"%04d.png",n)).path
 if path != lastFramePath { lastFrame=NSImage(contentsOfFile:path); lastFramePath=path }
 guard let im=lastFrame else {fatalError("Missing source frame: \(path)")}
 let ratio=min(dest.width/source.width,dest.height/source.height)
 let r=NSRect(x:dest.minX+(dest.width-source.width*ratio)/2,y:dest.minY+(dest.height-source.height*ratio)/2,width:source.width*ratio,height:source.height*ratio)
 im.draw(in:r,from:NSRect(x:source.minX,y:im.size.height-source.maxY,width:source.width,height:source.height),operation:.sourceOver,fraction:1,respectFlipped:true,hints:[.interpolation:NSImageInterpolation.high])
}
func pair(_ left:String,_ right:String,_ source:NSRect) {
 text("정상",48,171,550,24,mint,true,40);text("겹침",672,171,550,24,amber,true,40)
 cropShot(left,source,NSRect(x:48,y:219,width:560,height:354))
 cropShot(right,source,NSRect(x:672,y:219,width:560,height:354))
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
 case "hook":
  let q=CGFloat(max(0,min(1,(local-1)/2)))
  cropShot("order-after.png",NSRect(x:687*q,y:79*q,width:1280+(486-1280)*q,height:720+(328-720)*q),NSRect(x:48,y:170,width:760,height:425))
  side(["빨간 머그 × 2","합계 $24.00","실제 한국어 주문 완료","화면 기반 입력 · 클릭"],mint)
 case "goal":
  shot("order-before.png")
  box(840,180,392,300);text("업무 목표",865,203,342,23,mint,true,45)
  text("빨간 머그 2개\n받는 분: 테스터\nqa@example.test\n주문 완료까지",865,266,342,27,ink,true,190)
  text("실제 요청 요약 · 모의 결제",851,520,370,21,muted,false,45)
 case "quantity":
  box(48,174,1184,284)
  clip("q",local,1,72,NSRect(x:110,y:398,width:1060,height:157),NSRect(x:60,y:187,width:1160,height:257))
  text("입력칸의 1 → 2",70,492,530,33,mint,true,60)
  text("주문 요약의 $12 → $24",650,492,555,33,mint,true,60)
  text("실제 녹화 확대 · 표시 값은 원본 그대로",70,567,1120,22,muted,false,42)
 case "form":
  box(48,180,760,390)
  clip("form",local,2,168,NSRect(x:112,y:407,width:548,height:148),NSRect(x:66,y:197,width:724,height:351))
  side(["① 수량은 2로 유지","② 받는 분 입력","③ 이메일 입력","입력 후 값을 다시 읽기"],mint)
 case "submit":
  clip("submit",local,2,144,NSRect(x:0,y:0,width:1280,height:720),NSRect(x:48,y:169,width:760,height:428))
  side(["아래로 스크롤","주문 버튼 클릭","새 화면 확인","실제 녹화 · 2배속"],mint)
 case "result":
  cropShot("order-after.png",NSRect(x:690,y:80,width:480,height:323),NSRect(x:48,y:180,width:710,height:410))
  side(["빨간 머그 2개 · $24","주문 API: 201 확인","5행동 · 21모델 요청","전체 실행 약 144초"],mint)
 case "loop":
  let labels=["현재 화면\n관찰","입력·클릭\n대상 찾기","Midscene\n행동 실행","새 화면\n결과 확인"]
  let active=min(3,Int(local/3))
  for j in 0..<4 {let x:CGFloat=48+CGFloat(j)*308;box(x,219,260,245,cardColor,j==active ? mint:nil);text(String(format:"%02d",j+1),x+23,243,214,27,mint,true,50);text(labels[j],x+23,323,214,28,ink,true,106);if j<3{text("→",x+269,325,35,30,mint,true,60)}}
  text("aiInput · aiAct → aiString · aiAssert",70,500,1140,29,mint,true,55)
  text("정밀 위치 탐색 · 값 교체 · 입력값 재확인 · 완료 조건 검증",70,559,1140,23,muted,false,44)
 case "scope":
  cropShot("old-fault.jpg",NSRect(x:685,y:209,width:495,height:489),NSRect(x:48,y:181,width:553,height:411))
  box(640,184,592,170);text("DOM / 기능 검사",665,207,542,25,mint,true,50)
  text("주문·상품·금액 데이터: PASS",665,278,542,27,ink,true,70)
  box(640,377,592,186);text("화면의 읽기 문제",665,400,542,25,amber,true,50)
  text("사용자는 영수증을 읽을 수 없음",665,471,542,27,ink,true,70)
 case "oldresult":
  if local<7 {
   cropShot("old-fault.jpg",NSRect(x:685,y:209,width:495,height:489),NSRect(x:48,y:180,width:510,height:412))
   box(610,184,622,283);text("실제 모델 지적 · 한국어 요약",635,208,572,24,amber,true,52)
   text("영수증이 가려져\n상품명·금액·합계를\n읽을 수 없습니다.",635,283,572,32,ink,true,157)
   text("원문 위치: Your receipt section",622,493,596,22,muted,false,45)
   text("출처: 동일 결함 실행 ae75c703",622,552,596,22,muted,false,44)
  } else {
   cropShot("old-normal.jpg",NSRect(x:685,y:209,width:495,height:489),NSRect(x:48,y:180,width:510,height:412))
   side(["정상: 3/3 통과","선정한 결함: 3/3 지적","같은 기능 검사: 6/6 통과","정상 화면도 함께 확인"],mint)
  }
 case "current":
  pair("current-normal.png","current-overlap.png",NSRect(x:690,y:285,width:480,height:382))
  text("같은 구성요소 · 잘못된 배치가 실제 정보를 가립니다.",48,581,1184,23,muted,false,38)
 case "hybrid":
  let dest=NSRect(x:48,y:180,width:635,height:398)
  let src=NSRect(x:685,y:285,width:490,height:330)
  cropShot("current-overlap.png",src,dest)
  let ratio=min(dest.width/src.width,dest.height/src.height)
  let ox=dest.minX+(dest.width-src.width*ratio)/2,oy=dest.minY+(dest.height-src.height*ratio)/2
  let ctx=NSGraphicsContext.current!.cgContext
  ctx.saveGState();ctx.setStrokeColor(amber.cgColor);ctx.setLineWidth(3);ctx.setLineDash(phase:0,lengths:[8,5]);ctx.stroke(CGRect(x:ox+(820.125-src.minX)*ratio,y:oy+(393.09375-src.minY)*ratio,width:220*ratio,height:158*ratio));ctx.restoreGState()
  box(721,182,511,164);text("위치 기반 후보",745,202,463,24,mint,true,50);text("3/3 보존",745,272,463,37,ink,true,64)
  box(721,367,511,170);text("올바른 모델 설명",745,387,463,24,amber,true,50);text("0/3 · 미해결",745,457,463,35,ink,true,65)
  text("저장된 측정 영역 · 편집 주석",60,590,620,18,muted,false,27)
  text("모델 주장 ≠ 사람의 확정",737,562,475,23,amber,true,43)
 case "limits":
  box(48,184,565,384);box(645,184,587,384)
  text("이번 POC에서 확인",73,211,515,29,mint,true,63)
  text("화면 기반 한국어 주문 완료\n\n선별한 화면 결함의 실제 지적\n\n입력·응답·화면의 증거 연결",73,303,515,25,ink,false,235)
  text("아직 남은 과제",670,211,537,29,amber,true,63)
  text("시각 QA의 미탐·오탐\n\n겹침 앞뒤 관계의 잘못된 해석\n\n다양한 사이트의 반복 신뢰성",670,303,537,25,ink,false,235)
 case "end":
  let words=["읽기","행동","검증"]
  for j in 0..<3 {let x:CGFloat=48+CGFloat(j)*403;box(x,204,377,186,cardColor,mint);text(words[j],x+27,260,323,49,mint,true,92)}
  text("화면을 업무와 품질 검토의 근거로",65,439,1150,35,ink,true,73)
  text("github.com/Solution-AI-Agent/vision-test-poc",65,525,1150,25,muted,false,49)
 default: break
 }
 box(32,625,1216,69)
 let caps=s["captions"] as! [String]
 let cap=caps[min(caps.count-1,Int(local/duration*Double(caps.count)))]
 text(cap,54,636,1172,24,ink,false,54)
 let sourceLabel = i<7 ? "실제 주문 3e1ef9cc · 30B · 2026-10-06 · 저장 기록 편집" : (i<9 ? "이전 통제실험 ae75c703 / b7181596 · 현재 한국어 샘플 검출과 별개" : "현재 겹침 자료: hybrid-occlusion-20261006 · 후보와 모델 판단 분리")
 text(sourceLabel,48,697,1070,13,muted,false,18)
 text(String(format:"%02d / %02d",i+1,scenes.count),1152,697,90,13,muted,false,18)
 mint.setFill();NSRect(x:0,y:716,width:CGFloat(t/Double(total))*CGFloat(W),height:4).fill()
 NSGraphicsContext.restoreGraphicsState();CVPixelBufferUnlockBaseAddress(b,[]);return b
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
let output=sampleOnly ? scratch.appendingPathComponent("REPRESENTATIVE_R2.mp4") : base.appendingPathComponent("VISION_POC_RECAP_V6.mp4")
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
