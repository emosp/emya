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
          IsInterlaced: false,
          BitRate: bit_rate,
          // BitDepth: 10,
          // RefFrames: 1,
          IsDefault: true,
          IsForced: false,
          IsHearingImpaired: false,
          Height: stream.height,
          Width: stream.width,
          AverageFrameRate: Number(stream.avg_frame_rate.split('/')[0]),
          RealFrameRate: Number(stream.r_frame_rate.split('/')[0]),
          // Profile: 'Main 10',
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
        let audio_codec = stream.codec_name,
          audio_language = stream.tags.language || 'unknow',
          audio_channel_layout = stream.channel_layout
        streams.push({
          Codec: audio_codec,
          Language: audio_language,
          TimeBase: stream.time_base,
          DisplayTitle: `${audio_language} ${audio_codec} ${audio_channel_layout}`,
          DisplayLanguage: audio_language,
          IsInterlaced: false,
          ChannelLayout: audio_channel_layout,
          BitRate: Number(stream.bit_rate),
          Channels: stream.channels,
          SampleRate: Number(stream.sample_rate),
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
        let subtitle_codec = stream.codec_name,
          subtitle_language = stream.tags.language || 'unknow',
          subtitle_title = stream.tags.title || 'unknow'

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

  return {
    streams,
    bit_rate,
  }
}
