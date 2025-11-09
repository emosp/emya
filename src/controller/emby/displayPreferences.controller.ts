import { Controller, Inject, Req, Res, Get, Post, Delete, Put, Param, Query, Body, NotFoundException } from '@nestjs/common'

import * as db from '@/db'
import { MySql2Database } from 'drizzle-orm/mysql2'
import { EmbyService } from '@/controller/emby/emby.service'
import { TransformService } from '@/controller/emby/transform.service'

@Controller(['/emby/DisplayPreferences'])
export class DisplayPreferencesController {
  constructor(
    @Inject('DB') private model: MySql2Database<typeof db.schema>,
    private EmbyService: EmbyService,
    private TransformService: TransformService,
  ) {}

  @Get('Usersettings')
  async ShowUsersettings(@Req() req: any) {
    return {
      Id: 'usersettings',
      CustomPrefs: {},
      SortOrder: 'Ascending',
    }
  }
}
