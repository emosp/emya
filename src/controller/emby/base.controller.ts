import { Controller, Inject, Req, Res, Get, Post, Delete, Put, Param, Query, Body, NotFoundException } from '@nestjs/common'

import * as db from '@/db'
import { MySql2Database } from 'drizzle-orm/mysql2'
import { EmbyService } from '@/controller/emby/emby.service'

@Controller(['/emby'])
export class BaseController {
  constructor(
    @Inject('DB') private model: MySql2Database<typeof db.schema>,
    private EmbyService: EmbyService,
  ) {}

  @Get('Persons')
  async BasePersons() {
    return this.EmbyService.ItemResponse()
  }

  @Get('Genres')
  async BaseGenres() {
    let genres = await this.model.query.video_genre.findMany({
      columns: {
        id: true,
        name: true,
      },
      where: db.isNull(db.schema.video_genre.deleted_at),
    })

    let rows = genres.map((g) => ({
      Name: g.name,
      Id: String(g.id),
      Type: 'Genre',
    }))

    return this.EmbyService.ItemResponse(rows as any)
  }

  @Get('Tags')
  async BaseTags() {
    return this.EmbyService.ItemResponse()
  }

  @Get('OfficialRatings')
  async BaseOfficialRatings() {
    return this.EmbyService.ItemResponse()
  }

  @Get('Years')
  async BaseYears() {
    return this.EmbyService.ItemResponse()
  }

  @Get('Studios')
  async BaseStudios() {
    return this.EmbyService.ItemResponse()
  }
}
