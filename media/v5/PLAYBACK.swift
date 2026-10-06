import AVFoundation
import QuartzCore

@main struct Playback {
static func main() async throws {
    let file=URL(fileURLWithPath:CommandLine.arguments[1])
    let dest=URL(fileURLWithPath:CommandLine.arguments[2])
    let asset=AVURLAsset(url:file)
    let duration=try await asset.load(.duration).seconds
    let item=AVPlayerItem(asset:asset)
    let output=AVPlayerItemVideoOutput(pixelBufferAttributes:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA])
    item.add(output)
    let player=AVPlayer(playerItem:item)
    let wallStart=Date();var sampled=0,last=0.0,nextLog=10.0,complete=false
    player.play()
    while Date().timeIntervalSince(wallStart)<duration+30 {
        if item.status == .failed {throw item.error!}
        let t=player.currentTime().seconds
        if t.isFinite {
            last=t
            if output.hasNewPixelBuffer(forItemTime:player.currentTime()),output.copyPixelBuffer(forItemTime:player.currentTime(),itemTimeForDisplay:nil) != nil {sampled+=1}
            if t>=nextLog {print("PLAYBACK",Int(t),"/",Int(duration),"decoded samples",sampled);fflush(stdout);nextLog+=10}
            if t>=duration-0.01 {complete=true;break}
        }
        try await Task.sleep(nanoseconds:33_333_333)
    }
    player.pause()
    let report:[String:Any]=["file":file.path,"method":"AVPlayer real-time playback with AVPlayerItemVideoOutput; no GUI window","completed":complete,"last_time_seconds":last,"expected_duration_seconds":duration,"wall_seconds":Date().timeIntervalSince(wallStart),"sampled_decoded_buffers":sampled,"full_GUI_watch":false]
    let data=try JSONSerialization.data(withJSONObject:report,options:[.prettyPrinted,.sortedKeys])
    try data.write(to:dest);print(String(data:data,encoding:.utf8)!)
    if !complete || sampled<100 {exit(1)}
}}
