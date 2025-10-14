import { Controller, Inject, Req, Res, Get, Post, Delete, Put, Param, Query, Body } from '@nestjs/common'

import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import { Logger } from 'winston'

import * as db from '@/db'
import { MySql2Database } from 'drizzle-orm/mysql2'
import { EMBY_ITEM_ID_TYPE_VIDEO_LIST, EMBY_ITEM_ID_TYPE_VIDEO_EPISODE, EmbyService } from '@/controller/emby/emby.service'
import { ExternalApi } from '@/utils/request'

import { VideoMediaStatus, VideoMediaPathTypes } from '@/db/schema/video_media'
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'

@Controller(['/emby/videos'])
export class VideosController {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject('DB') private model: MySql2Database<typeof db.schema>,
    private EmbyService: EmbyService,
  ) {}

  @Get(':emby_media_uuid/AdditionalParts')
  async VideoAdditionalParts() {
    return this.EmbyService.ItemResponse()
  }

  /**
   * 获取播放地址
   * 安卓 AfuseKt 2.9.6.3 会自己拼地址 并自己生成 PlaySessionId
   * /emby/videos/[emby_item_id]/original.mkv?DeviceId=[DeviceId]&MediaSourceId=[MediaSourceId]&PlaySessionId=fe4dd12b6f6e4e2db494b8cb3b8adf38&api_key=[api_key]
   *
   * 安卓 yamby 1.6.2.16 会请求多次这个接口
   *
   * 其余大多数是 跳转 DirectStreamUrl 地址
   */
  @Get(':emby_media_uuid/:emby_media_name')
  async VideoPlay(@Param('emby_media_uuid') emby_media_uuid: string, @Query('line') line: string, @Req() req: any, @Res() res: any) {
    let user_id = req.user_id

    let cache_name = `video_play_${emby_media_uuid}_${user_id}_${line}`,
      cache_data = await this.cache.get(cache_name)

    if (cache_data) {
      return res.redirect(cache_data, 308)
    }

    let cache_seconds = 1000 * 60 * 60 * 3

    let log = (message) => this.logger.error(`video play: ${emby_media_uuid} = ${message} | ${req.headers?.['user-agent']} ${req.url}`)

    let video_media_uuid: string = emby_media_uuid

    let emby_item = this.EmbyService.ItemIdParse(emby_media_uuid)
    if (emby_item) {
      let emby_item_type = emby_item[0],
        emby_item_value = emby_item[1]

      let video_media_db_where: any = [db.isNull(db.schema.video_media.deleted_at)]

      switch (emby_item_type) {
        case EMBY_ITEM_ID_TYPE_VIDEO_LIST:
          video_media_db_where.push(db.eq(db.schema.video_media.video_list_id, emby_item_value))
          break
        case EMBY_ITEM_ID_TYPE_VIDEO_EPISODE:
          video_media_db_where.push(db.eq(db.schema.video_media.video_episode_id, emby_item_value))
          break
        default:
          log(emby_item_type)
          return res.status(422).send()
          break
      }

      video_media_uuid = (
        (await this.model.query.video_media.findFirst({
          columns: {
            uuid: true,
          },
          where: db.and(...video_media_db_where),
        })) as any
      )?.uuid
    }

    let video_media = await this.model.query.video_media.findFirst({
      columns: {
        id: true,
        uuid: true,
        video_list_id: true,
        video_season_id: true,
        video_episode_id: true,
        path_type: true,
        path_url: true,
      },
      where: db.and(
        // prettier-ignore
        db.eq(db.schema.video_media.uuid, video_media_uuid),
        db.eq(db.schema.video_media.status, VideoMediaStatus.STATUS_COMPLETE as any),
        db.isNull(db.schema.video_media.deleted_at),
      ),
    })

    if (!video_media) {
      return res.status(403).send()
    }

    // todo: 增加播放量

    let video_media_path_type = video_media.path_type,
      video_media_path_url = video_media.path_url

    let video_play_url: any = null

    switch (video_media_path_type) {
      case VideoMediaPathTypes.PATH_TYPE_URL:
        video_play_url = video_media_path_url
        break
      default:
        if (process.env.API_EXTERNAL) {
          let api_response: {
            code: number
            data: {
              url: string
              cache_seconds: number
            }
          } = await ExternalApi('/emby/videoGetUrl', {
            user_id,
            path_type: video_media_path_type,
            path_url: video_media_path_url,
            uuid: video_media.uuid,
            line,
          }).catch((error) => {
            log(`external api error ${error}`)
            return null
          })

          if (api_response && api_response.code == 200) {
            video_play_url = api_response.data.url
            cache_seconds = api_response.data.cache_seconds
          }
        }
        break
    }

    if (!video_play_url) {
      log(`${video_media_path_type} no url`)
      return res.status(404).send()
    }

    await this.cache.set(cache_name, video_play_url, 1000 * cache_seconds)

    return res.redirect(video_play_url, 308)
  }

  /**
   * 自定义字幕文件地址
   * 不支持 安卓 afusekt 2.9.6.3 自定义请求的字幕地址 /Videos/[emby_item_id]/[emby_media_uuid]/Subtitles/[emby_subtitle_id]/[emby_subtitle_name]?X-Emby-Token=[]&api_key=[]
   */
  @Get(':emby_media_uuid/subtitles/:emby_subtitle_id')
  async VideoSubtitle(@Param('emby_subtitle_id') emby_subtitle_id: number, @Req() req: any, @Res() res: any) {
    let cache_name = `video_subtitle_${emby_subtitle_id}`,
      cache_data = await this.cache.get(cache_name)

    if (cache_data) {
      return res.redirect(cache_data, 308)
    }

    let cache_seconds = 1000 * 60 * 60 * 3

    let log = (message) => this.logger.error(`video subtitle: ${emby_subtitle_id} = ${message} | ${req.headers?.['user-agent']} ${req.url}`)

    let subtitle_data = await this.model.query.video_subtitle.findFirst({
      columns: {
        path_type: true,
        path_url: true,
      },
      where: db.and(
        // prettier-ignore
        db.eq(db.schema.video_subtitle.id, emby_subtitle_id),
        db.isNull(db.schema.video_subtitle.deleted_at),
      ),
    })

    if (!subtitle_data) {
      return res.status(401).send()
    }

    let video_subtitle_path_type = subtitle_data.path_type,
      video_subtitle_path_url = subtitle_data.path_url

    let video_subtitle_url: any = null
    switch (video_subtitle_path_type) {
      case VideoMediaPathTypes.PATH_TYPE_URL:
        video_subtitle_url = video_subtitle_path_url
        break
      default:
        if (process.env.API_EXTERNAL) {
          let api_response: {
            code: number
            data: {
              url: string
              cache_seconds: number
            }
          } = await ExternalApi('/emby/subtitleGetUrl', {
            user_id: req.user_id,
            path_type: video_subtitle_path_type,
            path_url: video_subtitle_path_url,
            subtitle_id: emby_subtitle_id,
          }).catch((error) => {
            log(`external api error ${error}`)
            return null
          })

          if (api_response && api_response.code == 200) {
            video_subtitle_url = api_response.data.url
            cache_seconds = api_response.data.cache_seconds
          }
        }
        break
    }

    if (!video_subtitle_url) {
      log(`${video_subtitle_path_type} no url`)
      return res.status(404).send()
    }

    await this.cache.set(cache_name, video_subtitle_url, 1000 * cache_seconds)

    return res.redirect(video_subtitle_url, 308)
  }
}
