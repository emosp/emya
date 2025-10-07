import { Controller, Inject, Req, Res, Get, Post, Delete, Put, Param, Query, Body, NotFoundException } from '@nestjs/common'

import * as RequestDto from '@/controller/emby/request.dto'

import * as db from '@/db'
import { dayjs, formatTimeToEmby } from '@/utils/dayjs'
import { MySql2Database } from 'drizzle-orm/mysql2'
import {
  EmbyService,
  EMBY_DEFAULT_TIME,
  EMBY_ITEM_ID_TYPE_VIDEO_LIBRARY,
  EMBY_ITEM_ID_TYPE_VIDEO_LIST,
  EMBY_ITEM_ID_TYPE_VIDEO_SEASON,
  EMBY_ITEM_ID_TYPE_VIDEO_EPISODE,
} from '@/controller/emby/emby.service'
import { TransformService } from '@/controller/emby/transform.service'
import { VideoImageTypes } from '@/db/schema/video_image'

@Controller(['/emby/shows'])
export class ShowsController {
  constructor(
    @Inject('DB') private model: MySql2Database<typeof db.schema>,
    private EmbyService: EmbyService,
    private TransformService: TransformService,
  ) {}

  @Get('NextUp')
  async ShowNextUp() {
    return this.EmbyService.ItemResponse()
  }

  @Get(':emby_item_id/Seasons')
  async ShowSeasons(@Param('emby_item_id') emby_item_id: string, @Req() req: any) {
    let emby_item = this.EmbyService.ItemIdParse(emby_item_id)
    if (!emby_item) {
      throw new NotFoundException()
    }

    let seasons = await this.model.query.video_season.findMany({
      where: db.and(
        // prettier-ignore
        db.eq(db.schema.video_season.video_list_id, emby_item[1]),
        db.isNull(db.schema.video_season.deleted_at),
      ),
      with: {
        video_episodes: {
          columns: {
            id: true,
            video_season_id: true,
          },
          where: db.isNull(db.schema.video_episode.deleted_at),
        },
      },
    })

    let rows: any = []
    for (let season of seasons) {
      let season_item_id = this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_SEASON, season.id)
      rows.push({
        Name: season.title || `第 ${season.season_number} 季`,
        // 'ServerId'              : this.EmbyService.Id(),
        Id: season_item_id,
        ImageTags: {
          [VideoImageTypes.TYPE_PRIMARY]: season_item_id,
        },
        CanDelete: false,
        CanDownload: false,
        SupportsSync: true,
        Overview: season.description,
        IndexNumber: season.season_number,
        IsFolder: true,
        Type: 'Season',
        SeriesId: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_LIST, season.video_list_id),
        SeriesName: '',
        SeriesPrimaryImageTag: 'image',
        Genres: [],
        People: [],
        GenreItems: [],
        ChildCount: season.video_episodes.length,
      })
    }

    return this.EmbyService.ItemResponse(rows)
  }

  @Get(':emby_item_id/Episodes')
  async ShowEpisodes(@Param('emby_item_id') emby_item_id: string, @Query() query: RequestDto.ShowEpisodes, @Req() req: any) {
    let emby_item = this.EmbyService.ItemIdParse(emby_item_id)
    if (!emby_item) {
      throw new NotFoundException()
    }

    let sql_conditions: any = [
      // prettier-ignore
      db.isNull(db.schema.video_episode.deleted_at),
    ]

    // yamby 传参不对
    if (emby_item[0] == EMBY_ITEM_ID_TYPE_VIDEO_LIST) {
      sql_conditions.push(db.eq(db.schema.video_episode.video_list_id, emby_item[1]))
    }

    let query_season_id: any = query.seasonid
    if (query_season_id) {
      query_season_id = this.EmbyService.ItemIdParse(query_season_id)?.[1]
      sql_conditions.push(db.eq(db.schema.video_episode.video_season_id, query_season_id))
    }

    let episodes = await this.model.query.video_episode.findMany({
      where: db.and(...sql_conditions),
      with: {
        video_medias: {
          columns: {
            video_episode_id: true,
            file_second: true,
          },
          where: db.isNull(db.schema.video_media.deleted_at),
        },
      },
    })

    let rows: any = []
    for (let episode of episodes) {
      let episode_item_id = this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_EPISODE, episode.id),
        video_medias = episode.video_medias

      if (!video_medias.length) {
        // continue
      }

      rows.push({
        Name: episode.title,
        // ServerId: this.EmbyService.Id(),
        Id: episode_item_id,
        CanDownload: true,
        SupportsSync: true,
        PremiereDate: formatTimeToEmby(episode.date_air),
        RunTimeTicks: (video_medias[0]?.file_second as any) * 10000000,
        Overview: episode.description,
        // ProductionYear: Number(dayjs(episode.date_air).format('YYYY')),
        IndexNumber: episode.episode_number,
        ParentIndexNumber: episode.episode_number,
        IsFolder: false,
        Type: 'Episode',
        People: [],
        // ParentBackdropItemId: '',
        ParentBackdropImageTags: [],
        SeriesId: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_LIST, episode.video_list_id),
        SeriesName: '',
        SeasonId: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_SEASON, episode.video_season_id),
        SeasonName: '',
        PrimaryImageAspectRatio: 1.7,
        SeriesPrimaryImageTag: '',
        ImageTags: {
          [VideoImageTypes.TYPE_PRIMARY]: episode_item_id,
        },
        BackdropImageTags: [],
        Chapters: [],
        MediaSources: [],
        MediaType: 'Video',
      })
    }

    return this.EmbyService.ItemResponse(rows)
  }
}
