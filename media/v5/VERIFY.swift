import AppKit
import AVFoundation

@main struct Verify {
static func main() async throws {
    let file=URL(fileURLWithPath:CommandLine.arguments[1])
    let dest=URL(fileURLWithPath:CommandLine.arguments[2])
    try FileManager.default.createDirectory(at:dest,withIntermediateDirectories:true)
    let asset=AVURLAsset(url:file)
    let tracks=try await asset.loadTracks(withMediaType:.video)
    let duration=try await asset.load(.duration).seconds
    let size=try await tracks[0].load(.naturalSize)
    let fps=try await tracks[0].load(.nominalFrameRate)
    let audios=try await asset.loadTracks(withMediaType:.audio)
    let reader=try AVAssetReader(asset:asset)
    let output=AVAssetReaderTrackOutput(track:tracks[0],outputSettings:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA])
    reader.add(output);reader.startReading()
    var times:[Double]=[]
    let data=try Data(contentsOf:file.deletingLastPathComponent().appendingPathComponent("SCRIPT_STORYBOARD.json"))
    let doc=try JSONSerialization.jsonObject(with:data) as! [String:Any]
    for s in doc["scenes"] as! [[String:Any]] {
        let a=Double(s["start"] as! Int),d=Double(s["duration"] as! Int)
        times += [a+0.1,a+d/2,a+d-0.1]
    }
    // Additional transition/workflow checks, after the 45 scene snapshots.
    times += [2.5,45.5,145.0]
    let indices=times.map{Int(($0*Double(fps)).rounded())}
    var count=0,previous = -1.0,monotonic=true
    while let s=output.copyNextSampleBuffer() {
        let t=CMSampleBufferGetPresentationTimeStamp(s).seconds
        if t<=previous {monotonic=false};previous=t
        if let i=indices.firstIndex(of:count),let b=CMSampleBufferGetImageBuffer(s) {
            CVPixelBufferLockBaseAddress(b,[])
            let cg=CGContext(data:CVPixelBufferGetBaseAddress(b),width:CVPixelBufferGetWidth(b),height:CVPixelBufferGetHeight(b),bitsPerComponent:8,bytesPerRow:CVPixelBufferGetBytesPerRow(b),space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGBitmapInfo.byteOrder32Little.rawValue|CGImageAlphaInfo.premultipliedFirst.rawValue)!
            let rep=NSBitmapImageRep(cgImage:cg.makeImage()!)
            try rep.representation(using:.png,properties:[:])!.write(to:dest.appendingPathComponent(String(format:"DECODED_%02d.png",i+1)))
            CVPixelBufferUnlockBaseAddress(b,[])
        }
        count+=1
        if count % 240 == 0 { print("DECODE",count,"frames",t,"seconds");fflush(stdout) }
    }
    let report:[String:Any]=["method":"continuous AVAssetReader decode; snapshot buffers immediately, no seek", "file":file.path,"duration_seconds":duration,"width":size.width,"height":size.height,"fps":fps,"audio_tracks":audios.count,"decoded_frames":count,"monotonic_pts":monotonic,"reader_completed":reader.status == .completed,"last_pts":previous,"extracted_frames":times.count,"extract_times":times]
    let reportData=try JSONSerialization.data(withJSONObject:report,options:[.prettyPrinted,.sortedKeys])
    try reportData.write(to:dest.appendingPathComponent("DECODE_REPORT.json"));print(String(data:reportData,encoding:.utf8)!)
    if reader.status != .completed || !monotonic || count != Int((duration*Double(fps)).rounded()) {exit(1)}
}}
