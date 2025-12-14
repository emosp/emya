import { Controller, Inject, Req, Res, Get, Post, Delete, Put, Param, Query, Body } from '@nestjs/common'

import * as db from '@/db'
import { MySql2Database } from 'drizzle-orm/mysql2'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { EMBY_ITEM_ID_TYPE_VIDEO_LIST, EMBY_ITEM_ID_TYPE_VIDEO_EPISODE, EmbyService } from '@/controller/emby/emby.service'
import { formatTimeToEmby } from '@/utils/dayjs'

@Controller(['/emby/sessions'])
export class SessionsController {
  constructor(
    @Inject('REQUEST') private readonly request: any,
    @Inject('DB') private model: MySql2Database<typeof db.schema>,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private EmbyService: EmbyService,
  ) {}

  @Get()
  async Session() {
    return [
      {
        PlayState: {
          CanSeek: false,
          IsPaused: false,
          IsMuted: false,
          RepeatMode: 'RepeatNone',
          SleepTimerMode: 'None',
          SubtitleOffset: 0,
          Shuffle: false,
          PlaybackRate: 1,
        },
        AdditionalUsers: [],
        RemoteEndPoint: 'emya',
        Protocol: 'HTTP/1.1',
        PlayableMediaTypes: ['Audio', 'Video'],
        PlaylistIndex: 0,
        PlaylistLength: 0,
        Id: this.EmbyService.Id(),
        ServerId: this.EmbyService.Id(),
        UserId: '',
        UserName: '',
        Client: '',
        LastActivityDate: formatTimeToEmby(),
        DeviceName: '',
        InternalDeviceId: 0,
        DeviceId: '',
        ApplicationVersion: this.EmbyService.Version(),
        AppIconUrl: 'https://raw.githubusercontent.com/emosp/emya/refs/heads/main/logo.png',
        SupportedCommands: [],
        SupportsRemoteControl: false,
      },
    ]
  }

  @Post('Playing')
  async SessionPlaying(@Body() body: any, @Res() res: any) {
    let body_parse: {
      volumelevel: number
      ismuted: boolean
      ispaused: boolean
      repeatmode: string
      subtitleoffset: number
      playbackrate: number
      positionticks: number
      subtitlestreamindex: number
      audiostreamindex: number
      playmethod: string
      playsessionid: string
      mediasourceid: string
      canseek: boolean
      itemid: string
      eventname: string

      // 开始和停止时存在
      nowplayingqueue: []
      maxstreamingbitrate: number
      playbackstarttimeticks: number
      playlistindex: number
      playlistlength: number
    }

    try {
      body_parse = typeof body == 'string' ? JSON.parse(body.toLowerCase()) : body
    } catch (e) {
      this.request.log.error(`session play progress: ${e}`)
      return res.status(403).send()
    }

    let emby_item = this.EmbyService.ItemIdParse(body_parse.itemid)
    if (!emby_item) {
      return res.status(422).send()
    }

    /**
     * todo: supper Cinetry
     * Cinetry v0.7.3 回传无此字段
     * {"itemid":"itemid","positionticks":0,"ispaused":true,"playsessionid":"itemid"}
     */
    let video_media_uuid = body_parse.mediasourceid?.split('_')[0] || null,
      playing_media_data_cache_name = `playing_media_data_${video_media_uuid}`,
      playing_media_data: {
        id: number
        file_second: number
      } = JSON.parse((await this.cache.get(playing_media_data_cache_name)) || '{}')

    if (!playing_media_data?.id && video_media_uuid) {
      playing_media_data = (await this.model.query.video_media.findFirst({
        columns: {
          id: true,
          file_second: true,
        },
        where: db.eq(db.schema.video_media.uuid, video_media_uuid),
      })) as any

      await this.cache.set(playing_media_data_cache_name, JSON.stringify(playing_media_data), 1000 * 60 * 60)
    }

    let video_media_id = playing_media_data.id
    if (!video_media_id) {
      return res.status(422).send('error video media id')
    }

    let emby_item_type = emby_item[0],
      emby_item_value = emby_item[1]

    let where: any = [db.eq(db.schema.user_video_record.user_id, this.request.user_id)]

    if (emby_item_type == EMBY_ITEM_ID_TYPE_VIDEO_LIST) {
      where.push(db.eq(db.schema.user_video_record.video_list_id, emby_item_value))
    }

    if (emby_item_type == EMBY_ITEM_ID_TYPE_VIDEO_EPISODE) {
      where.push(db.eq(db.schema.user_video_record.video_episode_id, emby_item_value))
    }

    let play_seconds = body_parse.positionticks / 10000000,
      file_second = playing_media_data.file_second

    await this.model
      .update(db.schema.user_video_record)
      .set({
        play_seconds: play_seconds > 0 ? play_seconds : 0,
        video_media_id,
        is_complete: file_second ? file_second - play_seconds < 60 * 5 : false,
      })
      .where(db.and(...where))
    return res.status(204).send()
  }

  @Post('Playing/Progress')
  async SessionProgress(@Body() body: any, @Res() res: any) {
    return await this.SessionPlaying(body, res)
  }

  @Post('/Playing/Stopped')
  async SessionStopped(@Body() body: any, @Res() res: any) {
    return await this.SessionPlaying(body, res)
  }
}
