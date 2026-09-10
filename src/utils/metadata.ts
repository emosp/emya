import { FFProbeStream } from 'ffprobe'

// ffprobe -v quiet -print_format json -show_format -show_streams [video_path]
export const FormatVideo = (info: {
  streams: FFProbeStream[]
  format: {
    duration: string
    size: string
    bit_rate: string
    tags: {
      title?: string
      creation_time: string
    }
  }
}): {
  streams: Array<any>
  bit_rate: number
} => {
  let streams: Array<any> = []

  let bit_rate = Number(info.format?.bit_rate)

  for (let stream of info.streams || []) {
    let stream_index = stream.index

    switch (stream.codec_type) {
      case 'video':
        streams.push({
          Codec: stream.codec_name,
          ColorTransfer: stream.color_transfer,
          ColorPrimaries: stream.color_primaries,
          ColorSpace: stream.color_space,
          TimeBase: stream.time_base,
          // VideoRange: 'HDR 10',
          // DisplayTitle: '4K HDR 10 HEVC',
          DisplayTitle: `${stream.height}P ${stream.codec_name}`,
          IsInterlaced: false,
          BitRate: bit_rate,
          // BitDepth: 10,
          // RefFrames: 1,
          IsDefault: true,
          IsForced: false,
          IsHearingImpaired: false,
          Height: stream.height,
          Width: stream.width,
          AverageFrameRate: Number(stream.avg_frame_rate?.split('/')?.[0] || 24),
          RealFrameRate: Number(stream.r_frame_rate?.split('/')?.[0] || 24),
          Profile: stream.profile,
          Type: 'Video',
          AspectRatio: stream.display_aspect_ratio,
          Index: stream_index,
          IsExternal: false,
          IsTextSubtitleStream: false,
          SupportsExternalStream: false,
          Protocol: 'File',
          PixelFormat: stream.pix_fmt,
          Level: stream.level,
          IsAnamorphic: false,
          // ExtendedVideoType: 'Hdr10',
          // ExtendedVideoSubType: 'Hdr10',
          // ExtendedVideoSubTypeDescription: 'HDR 10',
          AttachmentSize: 0,
        })
        break
      case 'audio':
        let audio_codec = stream.codec_name || 'aac',
          audio_language = stream.tags?.language || '',
          audio_title = stream.tags?.title || audio_language || 'Stereo',
          audio_channel_layout = stream.channel_layout || 'stereo'
        streams.push({
          Codec: audio_codec,
          Language: audio_language,
          TimeBase: stream.time_base,
          DisplayTitle: `${audio_title} ${audio_codec} ${audio_channel_layout}`.trim(),
          DisplayLanguage: audio_language,
          IsInterlaced: false,
          ChannelLayout: audio_channel_layout,
          BitRate: Number(stream.bit_rate) || 192000,
          Channels: stream.channels || 2,
          SampleRate: Number(stream.sample_rate) || 48000,
          IsDefault: true,
          IsForced: false,
          IsHearingImpaired: false,
          Type: 'Audio',
          Index: stream_index,
          IsExternal: false,
          IsTextSubtitleStream: false,
          SupportsExternalStream: false,
          Protocol: 'File',
          ExtendedVideoType: 'None',
          ExtendedVideoSubType: 'None',
          ExtendedVideoSubTypeDescription: 'None',
          AttachmentSize: 0,
        })
        break
      // @ts-ignore
      case 'subtitle':
        let subtitle_codec = stream.codec_name || 'subrip',
          subtitle_language = stream.tags?.language || 'und',
          subtitle_title = stream.tags?.title || subtitle_language

        streams.push({
          Codec: subtitle_codec,
          Language: subtitle_language,
          TimeBase: stream.time_base,
          Title: subtitle_title,
          DisplayTitle: `${subtitle_title} (${subtitle_codec})`,
          DisplayLanguage: subtitle_title,
          IsInterlaced: false,
          IsDefault: false,
          IsForced: false,
          IsHearingImpaired: false,
          Type: 'Subtitle',
          Index: stream_index,
          IsExternal: false,
          DeliveryMethod: 'Encode',
          IsTextSubtitleStream: true,
          SupportsExternalStream: true,
          Protocol: 'File',
          ExtendedVideoType: 'None',
          ExtendedVideoSubType: 'None',
          ExtendedVideoSubTypeDescription: 'None',
          AttachmentSize: 0,
          SubtitleLocationType: 'InternalStream',
        })
        break
      default:
        break
    }
  }

  // 零探测保护：如果没有解析出视频轨或音频轨，提供合规的默认轨，防止 Infuse 触发网络探测
  const hasVideo = streams.some((s) => s.Type === 'Video')
  const hasAudio = streams.some((s) => s.Type === 'Audio')

  if (!hasVideo) {
    streams.unshift({
      Codec: 'hevc',
      DisplayTitle: '1080P HEVC',
      IsInterlaced: false,
      BitRate: bit_rate || 8000000,
      IsDefault: true,
      IsForced: false,
      IsHearingImpaired: false,
      Height: 1080,
      Width: 1920,
      AverageFrameRate: 24,
      RealFrameRate: 24,
      Profile: 'Main',
      Type: 'Video',
      AspectRatio: '16:9',
      Index: 0,
      IsExternal: false,
      IsTextSubtitleStream: false,
      SupportsExternalStream: false,
      Protocol: 'File',
      PixelFormat: 'yuv420p',
      Level: 120,
      IsAnamorphic: false,
      AttachmentSize: 0,
    })
  }

  if (!hasAudio) {
    streams.push({
      Codec: 'aac',
      Language: 'chi',
      DisplayTitle: '中文 (AAC 立体声)',
      DisplayLanguage: 'chi',
      IsInterlaced: false,
      ChannelLayout: 'stereo',
      BitRate: 192000,
      Channels: 2,
      SampleRate: 48000,
      IsDefault: true,
      IsForced: false,
      IsHearingImpaired: false,
      Type: 'Audio',
      Index: 1,
      IsExternal: false,
      IsTextSubtitleStream: false,
      SupportsExternalStream: false,
      Protocol: 'File',
      ExtendedVideoType: 'None',
      ExtendedVideoSubType: 'None',
      ExtendedVideoSubTypeDescription: 'None',
      AttachmentSize: 0,
    })
  }

  return {
    streams,
    bit_rate: bit_rate || 8000000,
  }
}
