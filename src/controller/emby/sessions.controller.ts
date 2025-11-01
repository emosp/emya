import { Controller, Inject, Req, Res, Get, Post, Delete, Put, Param, Query, Body } from '@nestjs/common'

import * as db from '@/db'
import { MySql2Database } from 'drizzle-orm/mysql2'
import { EMBY_ITEM_ID_TYPE_VIDEO_LIST, EMBY_ITEM_ID_TYPE_VIDEO_EPISODE, EmbyService } from '@/controller/emby/emby.service'
import { formatTimeToEmby } from '@/utils/dayjs'

@Controller(['/emby/sessions'])
export class SessionsController {
  constructor(
    @Inject('REQUEST') private readonly request: any,
    @Inject('DB') private model: MySql2Database<typeof db.schema>,
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

    let emby_item_type = emby_item[0],
      emby_item_value = emby_item[1]

    let where: any = [db.eq(db.schema.user_video_record.user_id, this.request.user_id)]

    if (emby_item_type == EMBY_ITEM_ID_TYPE_VIDEO_LIST) {
      where.push(db.eq(db.schema.user_video_record.video_list_id, emby_item_value))
    }

    if (emby_item_type == EMBY_ITEM_ID_TYPE_VIDEO_EPISODE) {
      where.push(db.eq(db.schema.user_video_record.video_episode_id, emby_item_value))
    }

    await this.model
      .update(db.schema.user_video_record)
      .set({
        play_seconds: body_parse.positionticks / 10000000,
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
