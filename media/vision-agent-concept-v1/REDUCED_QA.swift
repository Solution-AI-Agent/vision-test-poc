import AppKit
let base=URL(fileURLWithPath:CommandLine.arguments[1])
let dest=base.appendingPathComponent("QA_REDUCED_640")
try FileManager.default.createDirectory(at:dest,withIntermediateDirectories:true)
for name in ["DECODED_08","DECODED_11","DECODED_20","DECODED_23","DECODED_32","DECODED_35"] {
 let im=NSImage(contentsOf:base.appendingPathComponent("VIDEO_QA/\(name).png"))!
 let ctx=CGContext(data:nil,width:640,height:360,bitsPerComponent:8,bytesPerRow:640*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(cgContext:ctx,flipped:false)
 im.draw(in:NSRect(x:0,y:0,width:640,height:360),from:.zero,operation:.sourceOver,fraction:1,respectFlipped:false,hints:[.interpolation:NSImageInterpolation.high])
 NSGraphicsContext.restoreGraphicsState()
 let rep=NSBitmapImageRep(cgImage:ctx.makeImage()!)
 try rep.representation(using:.png,properties:[:])!.write(to:dest.appendingPathComponent(name+".png"))
}
print("6 decoded frames scaled to 640x360 for readability review")
