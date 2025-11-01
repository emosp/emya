import { Controller, Inject, Req, Res, All, Get, Post, Delete, Put, Param, Query, Body, MethodNotAllowedException, NotFoundException } from '@nestjs/common'

import { EMBY_ITEM_ID_TYPE_VIDEO_LIST, EmbyService } from '@/controller/emby/emby.service'
import { TransformService } from '@/controller/emby/transform.service'
import { IgnoreAuth } from '@/controller/emby/auth.decorator'

import { VideoTypes } from '@/db/schema/video_list'
import { VideoImagePathTypes } from '@/db/schema/video_image'

import { MySql2Database } from 'drizzle-orm/mysql2'
import * as db from '@/db'
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager'

@Controller(['/emby/items'])
export class ItemsController {
  constructor(
    @Inject('DB') private model: MySql2Database<typeof db.schema>,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private EmbyService: EmbyService,
    private TransformService: TransformService,
  ) {}

  @Get('/')
  async Items(@Req() req: any, @Query() query: any, @Res() res: any) {
    // hills 的搜索会用这个
    let url = req.url.replace('/emby/items', `/emby/users/${query.userid}/items`)
    return res.redirect(url, 301)
  }

  @Get('counts')
  async ItemsCount() {
    return {
      MovieCount: (
        await this.model
          .select({
            value: db.count(),
          })
          .from(db.schema.video_list)
          .where(db.eq(db.schema.video_list.video_type, VideoTypes.VIDEO_TYPE_MOVIE as any))
      )[0]['value'],
      SeriesCount: (
        await this.model
          .select({
            value: db.count(),
          })
          .from(db.schema.video_season)
      )[0]['value'],
      EpisodeCount: (
        await this.model
          .select({
            value: db.count(),
          })
          .from(db.schema.video_episode)
      )[0]['value'],
      GameCount: 0,
      ArtistCount: 0,
      ProgramCount: 0,
      GameSystemCount: 0,
      TrailerCount: 0,
      SongCount: 0,
      AlbumCount: 0,
      MusicVideoCount: 0,
      BoxSetCount: 0,
      BookCount: 0,
      ItemCount: 0,
    }
  }

  @Get(':emby_item_id/Images/:image_type')
  @IgnoreAuth()
  async ItemsImage(@Param('emby_item_id') emby_item_id: string, @Param('image_type') image_type: string, @Res() res: any) {
    let emby_item = this.EmbyService.ItemIdParse(emby_item_id)
    if (!emby_item) {
      return res.status(404).send()
    }

    let cache_name = `image_${emby_item_id}`,
      cache_data = await this.cache.get(cache_name)

    if (cache_data) {
      return res.redirect(cache_data, 301)
    }

    let data = await this.model.query.video_image.findFirst({
      columns: {
        path_type: true,
        path_url: true,
      },
      where: db.and(
        // prettier-ignore
        db.eq(db.schema.video_image.relation_type, emby_item[0]),
        db.eq(db.schema.video_image.relation_id, emby_item[1]),
        db.eq(db.schema.video_image.type, image_type),
        db.isNull(db.schema.video_image.deleted_at),
      ),
    })

    if (!data) {
      return res.status(403).send()
    }

    let url = data.path_url

    switch (data.path_type) {
      case VideoImagePathTypes.IMAGE_PATH_TYPE_TMDB:
        let tmdb_size = `w400`
        url = `https://image.tmdb.org/t/p/${tmdb_size}${data.path_url}`
        break

      default:
        break
    }

    await this.cache.set(cache_name, url, 1000 * 60 * 60)
    return res.redirect(url, 301)
  }

  @All(':emby_item_id/PlaybackInfo')
  async ItemPlaybackInfo(@Param('emby_item_id') emby_item_id: string, @Req() req: any) {
    if (!['GET', 'POST'].includes(req.method)) {
      throw new MethodNotAllowedException()
    }

    let emby_item = this.EmbyService.ItemIdParse(emby_item_id)
    if (!emby_item) {
      throw new NotFoundException()
    }

    let user_id = req.user_id

    let video_list_id: any = null,
      video_season_id: any = null,
      video_episode_id: any = null

    let play_session_where: any = [db.eq(db.schema.user_video_record.user_id, user_id)]

    let emby_item_type = emby_item[0],
      emby_item_value = emby_item[1]
    if (emby_item_type == EMBY_ITEM_ID_TYPE_VIDEO_LIST) {
      video_list_id = emby_item_value
    } else {
      video_episode_id = emby_item_value
      let video_episode_info: any = await this.model.query.video_episode.findFirst({
        columns: {
          video_list_id: true,
          video_season_id: true,
        },
        where: db.eq(db.schema.video_episode.id, video_episode_id),
      })

      video_list_id = video_episode_info.video_list_id
      video_season_id = video_episode_info.video_season_id

      play_session_where.push(db.eq(db.schema.user_video_record.video_episode_id, video_episode_id))
    }
    play_session_where.push(db.eq(db.schema.user_video_record.video_list_id, video_list_id))

    let play_session_id = emby_item_id

    let play_session_has = Boolean(
      (await this.model.query.user_video_record.findFirst({
        columns: {
          id: true,
        },
        where: db.and(...play_session_where),
      })) as any,
    )

    if (!play_session_has) {
      await this.model.insert(db.schema.user_video_record).values({
        video_list_id,
        video_season_id,
        video_episode_id,
        user_id,
      })
    }

    return {
      MediaSources: await this.TransformService.VideoMedia(video_list_id, video_episode_id, false, play_session_id),
      PlaySessionId: play_session_id,
    }
  }

  @Get(':emby_item_id/Similar')
  async ItemsSimilar() {
    return this.EmbyService.ItemResponse()
  }
}
