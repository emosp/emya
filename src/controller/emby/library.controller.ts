import { Controller, Inject, Req, Res, Get, Post, Delete, Put, Param, Query, Body, NotFoundException } from '@nestjs/common'

import * as db from '@/db'
import { MySql2Database } from 'drizzle-orm/mysql2'
import { EmbyService } from '@/controller/emby/emby.service'
import { TransformService } from '@/controller/emby/transform.service'

@Controller(['/emby/library'])
export class LibraryController {
  constructor(
    @Inject('DB') private model: MySql2Database<typeof db.schema>,
    private EmbyService: EmbyService,
    private TransformService: TransformService,
  ) {}

  @Get('MediaFolders')
  async ShowMediaFolders(@Req() req: any) {
    let rows = await this.TransformService.getUserLibrary(req.user_id)
    return this.EmbyService.ItemResponse(rows)
  }
}
