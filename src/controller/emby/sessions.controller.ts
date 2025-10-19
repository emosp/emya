import { Controller, Inject, Req, Res, Get, Post, Delete, Put, Param, Query, Body } from '@nestjs/common'

import { SessionPlaying } from '@/controller/emby/request.dto'

import * as db from '@/db'
import { MySql2Database } from 'drizzle-orm/mysql2'
import { EmbyService } from '@/controller/emby/emby.service'
import { formatTimeToEmby } from '@/utils/dayjs'

@Controller(['/emby/sessions'])
export class SessionsController {
  constructor(
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
  async SessionPlaying(@Body() body: SessionPlaying, @Res() res: any) {
    return res.status(204).send()
  }

  @Post('Playing/Progress')
  async SessionProgress(@Body() body: SessionPlaying, @Res() res: any) {
    return res.status(204).send()
  }

  @Post('/Playing/Stopped')
  async SessionStopped(@Body() body: SessionPlaying, @Res() res: any) {
    return res.status(204).send()
  }
}
