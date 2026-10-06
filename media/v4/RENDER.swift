import AppKit
import AVFoundation
import CoreVideo
import CoreText

// Local-only, deterministic motion explainer. Original screenshots are never retouched.
// Crop/enlarge and animated annotations are editorial overlays, explicitly labeled.
let base = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "OUTBOX/VISION_TEST_LUMEN_V4").standardizedFileURL
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let artifact = base.appendingPathComponent("ASSETS")
let scratch = root.appendingPathComponent(".scratch/VISION_TEST_LUMEN_V4")
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
func render(_ t:Double)->CVPixelBuffer {
    let i=scenes.lastIndex(where:{Double($0["start"] as! Int)<=t})!
    let s=scenes[i], local=t-Double(s["start"] as! Int), duration=Double(s["duration"] as! Int)
    let kind=s["kind"] as! String, items=s["items"] as! [String]
    var buffer:CVPixelBuffer?
    CVPixelBufferCreate(kCFAllocatorDefault,W,H,kCVPixelFormatType_32ARGB,[kCVPixelBufferCGImageCompatibilityKey:true,kCVPixelBufferCGBitmapContextCompatibilityKey:true] as CFDictionary,&buffer)
    let b=buffer!; CVPixelBufferLockBaseAddress(b,[])
    let ctx=CGContext(data:CVPixelBufferGetBaseAddress(b),width:W,height:H,bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(b),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)!
    ctx.translateBy(x:0,y:CGFloat(H));ctx.scaleBy(x:1,y:-1)
    NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:true)
    NSColor(calibratedRed:0.025,green:0.055,blue:0.07,alpha:1).setFill();NSRect(x:0,y:0,width:W,height:H).fill()
    text(s["title"] as! String,48,64,1184,40,ink,true,56)
    text(s["kicker"] as! String,48,120,1184,19,muted,false,30)
    switch kind {
    case "intro":
        text("SCREEN → PLAN → ACT → VERIFY",80,204,1100,38,mint,true,64)
        text(items[0],80,295,1100,38,ink,true,64)
        text(items[1],80,362,1100,38,ink,true,64)
        box(80,468,1120,80)
        text("Web / YouTube 우선   ·   한국어 자막   ·   실제 실행 증거",110,492,1060,24,muted,false,46)
    case "modes", "compare":
        for j in 0..<2 {
            let x:CGFloat=48+CGFloat(j)*610; let parts=items[j].components(separatedBy:"|")
            box(x,184,574,355,cardColor,j==Int(local/3)%2 ? mint : nil)
            text(j==0 ? "01" : "02",x+28,210,100,34,mint,true,54)
            text(parts[0],x+28,282,520,31,ink,true,80)
            text(parts[1],x+28,368,516,28,muted,false,112)
        }
        if kind=="compare" { text("실행 중 경로를 선택하는 방식의 비교 · 성능 우위 결론 없음",60,557,1160,23,amber,false,42) }
    case "loop":
        let active=min(3,Int(local/2.5))
        for j in 0..<4 {
            let x:CGFloat=48+CGFloat(j)*308
            box(x,250,260,190,cardColor,j==active ? mint : nil)
            text(String(format:"%02d",j+1),x+24,274,200,28,mint,true,48)
            text(items[j],x+24,350,222,25,ink,true,66)
            if j<3 { text("→",x+270,322,35,30,mint,true,60) }
        }
        text("화면 이미지만 계획·판단에 공급 · DOM / locator fallback 없음",64,498,1150,25,muted,false,60)
    case "registered":
        shot(reg+"/model-request-1.jpg")
        side(items,ink)
        text("모델 계획: 검색창 click (431, 32)",842,398,388,23,mint,true,100)
    case "sequence":
        let j=min(3,Int(local/3))
        let files=["0-after.png","1-after.png","2-after.png","4-decision.png"]
        shot(reg+"/"+files[j])
        side(items,ink)
        box(840,185+CGFloat(j)*87,392,72,cardColor,mint)
        text(items[j],860,201+CGFloat(j)*87,350,22,mint,true,56)
    case "result":shot(reg+"/4-decision.png");side(items)
    case "baseline":shot(baseline+"/2-after.png");side(items)
    case "goal":
        shot(aut+"/model-request-1.jpg");side(items,amber)
        text("첫 행동: type · 클릭/포커스 없음",842,464,388,23,amber,true,96)
    case "mismatch":
        let im=image(aut+"/model-request-3.jpg")
        box(48,174,1184,168)
        // NSImage source rect is in bottom-origin image coordinates.
        im.draw(in:NSRect(x:60,y:186,width:1160,height:131),from:NSRect(x:0,y:im.size.height-145,width:im.size.width,height:145),operation:.sourceOver,fraction:1,respectFlipped:true,hints:[.interpolation:NSImageInterpolation.high])
        let p=NSBezierPath(roundedRect:NSRect(x:340,y:190,width:548,height:45),xRadius:6,yRadius:6)
        amber.setStroke(); p.lineWidth=3;p.stroke()
        for j in 0..<2 {
            let x:CGFloat=48+CGFloat(j)*610;let parts=items[j].components(separatedBy:"|")
            box(x,374,574,183,cardColor,j==1 ? amber : nil)
            text(parts[0],x+26,398,522,22,muted,false,45)
            text(parts[1],x+26,457,522,29,j==1 ? amber : ink,true,80)
        }
    case "stop":shot(aut+"/3-after.png");side(items,amber)
    case "evidence":
        lines(items,177,91)
    case "latestgoal":
        shot(latest+(local<4 ? "/model-request-4.jpg" : "/model-request-8.jpg"));side(items,amber)
    case "latestmismatch":
        shot(latest+"/model-request-8.jpg")
        for j in 0..<2 {
            let parts=items[j].components(separatedBy:"|");let y:CGFloat=174+CGFloat(j)*125
            box(840,y,392,112,cardColor,j==1 ? amber : nil)
            text(parts[0],858,y+14,356,20,muted,false,30)
            text(parts[1],858,y+55,356,23,j==1 ? amber : ink,true,52)
        }
        text(items[2],842,450,386,22,ink,true,62)
        text(items[3],842,527,386,21,muted,false,62)
    case "numbers":
        for j in 0..<3 {
            let x:CGFloat=48+CGFloat(j)*404;let p=items[j].components(separatedBy:"|")
            box(x,194,376,354)
            text(p[0],x+24,220,330,28,j==0 ? mint : amber,true,54)
            text(p[1],x+24,300,330,24,ink,true,76)
            text(p[2],x+24,379,330,27,ink,true,55)
            text(p[3],x+24,443,330,26,ink,true,55)
            text("응답 보고 비용 · 실행별 기록",x+24,505,330,17,muted,false,34)
        }
    case "scope":lines(items,175,89,amber)
    default:
        text("PLAN FROM SCREEN.",80,210,1100,46,mint,true,70)
        text("CHECK WITH EVIDENCE.",80,284,1100,46,ink,true,70)
        text(items.joined(separator:"  /  "),80,402,1100,29,amber,true,90)
        text("검토 기준: POC-LEAD · 10:39 UTC    |    후속 재검증은 별도 버전",80,516,1100,20,muted,false,50)
    }
    box(32,616,1216,70,NSColor(calibratedRed:0.065,green:0.12,blue:0.145,alpha:1))
    let captions=s["captions"] as! [String]
    let cap=captions[min(captions.count-1,Int(local/duration*Double(captions.count)))]
    text(cap,54,628,1172,25,ink,false,56)
    let footer = ["registered","sequence","result"].contains(kind) ? "SOURCE 044ecb6b · 8fcac127" : (["goal","mismatch","stop"].contains(kind) ? "SOURCE 5739f389 · 8fcac127" : (kind=="baseline" ? "SOURCE f0b467c9 · locator baseline" : "SOURCE POC-LEAD independent reviews"))
    let sourceLabel = ["latestgoal","latestmismatch"].contains(kind) ? "SOURCE 882f0db4 · 82f28b93 · goal-first-v4" : footer
    text(sourceLabel,48,695,1070,13,muted,false,20)
    text(String(format:"%02d / %02d",i+1,scenes.count),1152,695,90,13,muted,false,20)
    mint.setFill();NSRect(x:0,y:716,width:CGFloat(t/Double(total))*CGFloat(W),height:4).fill()
    NSGraphicsContext.restoreGraphicsState();CVPixelBufferUnlockBaseAddress(b,[])
    return b
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
    savePNG(render(t),scratch.appendingPathComponent(String(format:"SCENE_%02d.png",i+1)))
}
if previewOnly { print("PREVIEW",scenes.count,"frames; text overflow:",overflow);exit(overflow.isEmpty ? 0 : 1) }
let output=sampleOnly ? scratch.appendingPathComponent("REPRESENTATIVE_R2.mp4") : base.appendingPathComponent("VISION_TEST_LUMEN_ROUGHCUT_V4.mp4")
if FileManager.default.fileExists(atPath:output.path) { fatalError("Refusing to overwrite existing video") }
let writer=try AVAssetWriter(outputURL:output,fileType:.mp4)
writer.shouldOptimizeForNetworkUse=true
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:W,AVVideoHeightKey:H,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:3_000_000,AVVideoMaxKeyFrameIntervalKey:fps*2,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel]])
input.expectsMediaDataInRealTime=false
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String:W,kCVPixelBufferHeightKey as String:H])
writer.add(input);guard writer.startWriting() else { fatalError("Writer: \(String(describing:writer.error))") }
writer.startSession(atSourceTime:.zero)
let renderSeconds = sampleOnly ? 8 : total
let timeOffset = sampleOnly ? 122.0 : 0.0
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
