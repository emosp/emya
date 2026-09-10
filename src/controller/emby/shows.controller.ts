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

    let video_list_id = emby_item[1]

    let video_title = await this.TransformService.GetVideoListTitleById(video_list_id)

    let seasons = await this.model.query.video_season.findMany({
      where: db.and(
        // prettier-ignore
        db.eq(db.schema.video_season.video_list_id, video_list_id),
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

    let server_id = this.EmbyService.Id(),
      video_list_item_id = this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_LIST, video_list_id)

    let rows: any = []
    for (let season of seasons) {
      let season_item_id = this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_SEASON, season.id),
        season_title = season.title || `第 ${season.season_number} 季`
      rows.push({
        Name: season_title,
        SortName: season_title,
        ServerId: server_id,
        Id: season_item_id,
        PrimaryImageTag: season_item_id,
        ImageTags: {
          [VideoImageTypes.TYPE_PRIMARY]: season_item_id,
        },
        CanDelete: false,
        CanDownload: false,
        SupportsSync: true,
        Overview: season.description,
        IndexNumber: season.season_number,
        IsFolder: true,
        ParentId: video_list_item_id,
        Type: 'Season',
        SeriesId: video_list_item_id,
        SeriesName: video_title,
        SeriesPrimaryImageTag: video_list_item_id,
        Genres: [],
        People: [],
        GenreItems: [],
        ChildCount: season.video_episodes.length,
        // RecursiveItemCount: 0,
        Etag: season_item_id,
        DateCreated: formatTimeToEmby(season.created_at),
        UserData: {
          UnplayedItemCount: season.video_episodes.length,
          PlaybackPositionTicks: 0,
          PlayCount: 0,
          IsFavorite: false,
          Played: false,
        },
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

    let has_media_sources = req.query.fields?.includes('MediaSources'),
      with_video_medias: any = {
        columns: {
          video_episode_id: true,
          file_second: true,
        },
        where: db.isNull(db.schema.video_media.deleted_at),
      }

    if (has_media_sources) {
      with_video_medias = {
        columns: {
          uuid: true,
          name: true,
          file_size: true,
          file_second: true,
          file_matadata: true,
          file_container: true,
          file_chapters: true,
          path_type: true,
        },
        with: {
          subtitles: {
            columns: {
              id: true,
              video_media_id: true,
              title: true,
              codec: true,
            },
            where: db.isNull(db.schema.video_subtitle.deleted_at),
          },
        },
        where: db.isNull(db.schema.video_media.deleted_at),
      }
    }

    let episodes = await this.model.query.video_episode.findMany({
      where: db.and(...sql_conditions),
      with: {
        video_medias: with_video_medias,
        user_video_records: {
          columns: {
            play_seconds: true,
            is_complete: true,
          },
          where: db.and(
            // prettier-ignore
            db.eq(db.schema.user_video_record.user_id, req.user_id),
          ),
        },
      },
    })

    const targetSeasonId = query_season_id || episodes[0]?.video_season_id
    let season_data: any = targetSeasonId
      ? await this.model.query.video_season.findFirst({
          columns: {
            title: true,
            season_number: true,
          },
          where: db.eq(db.schema.video_season.id, targetSeasonId),
        })
      : null

    let video_title = await this.TransformService.GetVideoListTitleById(episodes[0]?.video_list_id)

    let server_id = this.EmbyService.Id()

    let rows: any = []
    for (let episode of episodes) {
      let episode_item_id = this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_EPISODE, episode.id),
        video_medias: any = episode.video_medias,
        video_media_first_file_second = video_medias[0]?.file_second

      if (!video_medias.length) {
        // continue
      }

      let user_video_record = await this.TransformService.formatUserVideoRecord(episode.user_video_records[0], video_media_first_file_second)

      rows.push({
        Name: episode.title,
        SortName: episode.title,
        Path: this.EmbyService.DefaultPath(),
        // Genres: [],
        ServerId: server_id,
        Id: episode_item_id,
        CanDownload: true,
        SupportsSync: true,
        PremiereDate: formatTimeToEmby(episode.date_air),
        RunTimeTicks: video_media_first_file_second ? Number(video_media_first_file_second) * 10000000 : 0,
        Overview: episode.description || '',
        // ProductionYear: Number(dayjs(episode.date_air).format('YYYY')),
        IndexNumber: episode.episode_number,
        ParentIndexNumber: season_data?.season_number || 1,
        IsFolder: false,
        Type: 'Episode',
        People: [],
        // ParentBackdropItemId: '',
        ParentBackdropImageTags: [],
        SeriesId: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_LIST, episode.video_list_id),
        SeriesName: video_title || '',
        SeriesPrimaryImageTag: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_LIST, episode.video_list_id),
        SeasonId: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_SEASON, episode.video_season_id),
        SeasonName: season_data?.title || `第 ${season_data?.season_number || 1} 季`,
        PrimaryImageAspectRatio: 1.7,
        PrimaryImageTag: episode_item_id,
        Etag: episode_item_id,
        ImageTags: {
          [VideoImageTypes.TYPE_PRIMARY]: episode_item_id,
        },
        BackdropImageTags: [],
        Chapters: [],
        MediaSources: has_media_sources ? await this.TransformService.VideoMediaFormat(video_medias) : [],
        MediaType: 'Video',
        UserData: {
          PlayedPercentage: user_video_record.percentage,
          PlaybackPositionTicks: user_video_record.play_ms,
          PlayCount: 0,
          IsFavorite: false,
          Played: user_video_record.is_complete,
        },
      })
    }

    return this.EmbyService.ItemResponse(rows)
  }
}
