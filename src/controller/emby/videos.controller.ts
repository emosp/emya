import { Controller, Inject, Req, Res, Get, Post, Delete, Put, Param, Query, Body, Head } from '@nestjs/common'

import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import { Logger } from 'winston'

import * as db from '@/db'
import { MySql2Database } from 'drizzle-orm/mysql2'
import { EMBY_ITEM_ID_TYPE_VIDEO_LIST, EMBY_ITEM_ID_TYPE_VIDEO_EPISODE, EmbyService } from '@/controller/emby/emby.service'
import { ExternalApi } from '@/utils/request'

import { VideoMediaStatus, VideoMediaPathTypes } from '@/db/schema/video_media'
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'

/**
 * 安全处理 OneDrive / Google Drive 直链
 * 避免 encodeURI 将 Base64/签名中的 %2B 破坏为 %252B 导致 401 鉴权失效
 */
function safePlayUrl(url: string): string {
  if (!url) return url
  if (/%[0-9a-fA-F]{2}/.test(url)) {
    return url.replace(/ /g, '%20')
  }
  try {
    return encodeURI(url)
  } catch {
    return url
  }
}

@Controller(['/emby/videos', '/videos'])
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
   * 
   * Infuse 会自己拼接并请求地址 并加入 Static=true
   */
  @Get([':emby_media_uuid', ':emby_media_uuid/:emby_media_name'])
  @Head([':emby_media_uuid', ':emby_media_uuid/:emby_media_name'])
  async VideoPlay(@Param('emby_media_uuid') emby_media_uuid: string, @Query('line') line: string, @Req() req: any, @Res() res: any) {
    let user_id = req.user_id

    let cache_name = `video_play_${emby_media_uuid}_${user_id}_${line}`,
      cache_data = await this.cache.get(cache_name)

    if (cache_data) {
      // 命中服务端直链缓存：针对 OneDrive 1小时有效期，返回 302 临时重定向和半小时客户端缓存
      res.header('Cache-Control', 'private, max-age=1800')
      return res.redirect(cache_data, 302)
    }

    // 针对 OneDrive 直链 1 小时（3600秒）有效期，默认缓存设为 3000 秒（50分钟）留出刷新冗余
    let cache_seconds = 3000

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
    
    let video_media_id = video_media.id

    await this.model
      .update(db.schema.video_media)
      .set({
        number_view: db.sql`${db.schema.video_media.number_view} + 1`,
      })
      .where(db.eq(db.schema.video_media.id, video_media_id))

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
          } = await ExternalApi('/emby/getVideoUrl', {
            media_id: video_media_id,
            user_id,
            path_type: video_media_path_type,
            path_url: video_media_path_url,
            uuid: video_media.uuid,
            line,
          })
            .catch(() =>
              ExternalApi('/emby/videoGetUrl', {
                media_id: video_media_id,
                user_id,
                path_type: video_media_path_type,
                path_url: video_media_path_url,
                uuid: video_media.uuid,
                line,
              }),
            )
            .catch((error) => {
              log(`external api error ${error}`)
              return null
            })

          if (api_response && api_response.code == 200) {
            video_play_url = api_response.data.url
            // 针对 OneDrive 1小时有效期安全限幅
            cache_seconds = Math.max(60, Math.min(api_response.data.cache_seconds || 3000, 3600))
          }
        }
        break
    }

    if (!video_play_url) {
      log(`${video_media_path_type} no url`)
      return res.status(404).send()
    }

    video_play_url = safePlayUrl(video_play_url)
    // 服务端缓存留出 120 秒冗余，避免在临界点分发失效 URL
    let server_cache = Math.max(60, cache_seconds - 120)
    await this.cache.set(cache_name, video_play_url, 1000 * server_cache)

    // 客户端缓存留出 300 秒冗余（最长 45 分钟），确保 OneDrive 直链过期前提前向 Emya 刷新，防止中途报 401
    let client_cache = Math.max(60, Math.min(cache_seconds - 300, 2700))
    res.header('Cache-Control', `private, max-age=${client_cache}`)
    return res.redirect(video_play_url, 302)
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
      res.header('Cache-Control', 'private, max-age=1800')
      return res.redirect(cache_data, 302)
    }

    let cache_seconds = 3000

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
            cache_seconds = Math.max(60, Math.min(api_response.data.cache_seconds || 3000, 3600))
          }
        }
        break
    }

    if (!video_subtitle_url) {
      log(`${video_subtitle_path_type} no url`)
      return res.status(404).send()
    }

    video_subtitle_url = safePlayUrl(video_subtitle_url)
    let server_cache = Math.max(60, cache_seconds - 120)
    await this.cache.set(cache_name, video_subtitle_url, 1000 * server_cache)

    let client_cache = Math.max(60, Math.min(cache_seconds - 300, 2700))
    res.header('Cache-Control', `private, max-age=${client_cache}`)
    return res.redirect(video_subtitle_url, 302)
  }

  /**
   * 支持安卓 AfuseKt 2.9+ 自定义请求的字幕地址
   * /Videos/[emby_item_id]/[emby_media_uuid]/Subtitles/[emby_subtitle_id]/[emby_subtitle_name]
   */
  @Get(':emby_item_id/:emby_media_uuid/subtitles/:emby_subtitle_id/:emby_subtitle_name?')
  async VideoSubtitleAfuseKt(@Param('emby_subtitle_id') emby_subtitle_id: number, @Req() req: any, @Res() res: any) {
    return await this.VideoSubtitle(emby_subtitle_id, req, res)
  }
}
