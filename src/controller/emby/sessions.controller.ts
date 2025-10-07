import { Controller, Inject, Req, Res, Get, Post, Delete, Put, Param, Query, Body } from '@nestjs/common'

import { SessionPlaying } from '@/controller/emby/request.dto'

import * as db from '@/db'
import { MySql2Database } from 'drizzle-orm/mysql2'
import { EmbyService } from '@/controller/emby/emby.service'

@Controller(['/emby/sessions'])
export class SessionsController {
  constructor(
    @Inject('DB') private model: MySql2Database<typeof db.schema>,
    private EmbyService: EmbyService,
  ) {}

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
