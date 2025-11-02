import { Controller, Inject, Req, Res, All, Get, Post, Delete, Put, Param, Query, Body, MethodNotAllowedException, NotFoundException } from '@nestjs/common'

import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import { Logger } from 'winston'

import * as RequestDto from '@/controller/emby/request.dto'
import { IgnoreAuth } from '@/controller/emby/auth.decorator'
import * as argon2 from 'argon2'

import * as db from '@/db'
import { MySql2Database } from 'drizzle-orm/mysql2'
import {
  EmbyService,
  EMBY_DEFAULT_TIME,
  EMBY_ITEM_ID_TYPE_VIDEO_LIBRARY,
  EMBY_ITEM_ID_TYPE_VIDEO_LIST,
  EMBY_ITEM_ID_TYPE_VIDEO_EPISODE,
  EMBY_ITEM_ID_TYPE_VIDEO_SEASON,
} from '@/controller/emby/emby.service'
import { TransformService } from '@/controller/emby/transform.service'
import { randomString } from '@/utils/random'
import { dayjs } from '@/utils/dayjs'

import { ExternalApi } from '@/utils/request'
import { VIDEO_TYPE_TV } from '@/db/schema/video_list'
import { VideoImageTypes } from '@/db/schema/video_image'

@Controller(['/emby/users'])
export class UsersController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject('DB') private model: MySql2Database<typeof db.schema>,
    private EmbyService: EmbyService,
    private TransformService: TransformService,
  ) {}

  @Get('public')
  @IgnoreAuth()
  async UserPublic() {
    return []
  }

  @Post('AuthenticateByName')
  @IgnoreAuth()
  async AuthenticateByName(@Body() body: RequestDto.Auth, @Req() req: any, @Res() res: any, @Query() query: any) {
    let emby_devices: {
      client?: string
      device?: string
      deviceid?: string
      version?: string
    } = {}

    let ua = req.headers?.['user-agent']
    let emby_authorization = req.headers?.['x-emby-authorization']
    if (emby_authorization) {
      // MediaBrowser Client="Client", Device="Device", DeviceId="DeviceId", Version="Version"
      // Emby UserId=3fe38fdc-683f-4f5b-84ed-ff8339709fbe,Client=Client,Device=Device,DeviceId=DeviceId,Version=Version
      emby_authorization
        .replace('MediaBrowser ', '')
        .replace('Emby ', '')
        .replaceAll(', ', ',')
        .split(',')
        .forEach((part: string) => {
          let [key, value] = part.split('=')
          if (key && value) {
            emby_devices[key.toLowerCase()] = value.replace(/"/g, '').substring(0, 200)
          }
        })
    } else {
      emby_devices.client = query?.['x-emby-client']
      emby_devices.device = query?.['x-emby-device-name']
      emby_devices.deviceid = query?.['x-emby-device-id']
      emby_devices.version = query?.['x-emby-client-version']
    }

    if (!emby_devices.deviceid) {
      this.logger.error(`no x-emby-authorization ${ua}`)
      return res.status(401).send('暂不兼容此设备 无 x-emby-authorization')
    }

    let user_id = 0
    if (process.env.API_EXTERNAL) {
      let data: {
        code: number
        message: string
        data: {
          user_id: number
          username: string
          folders: Array<number>
          is_can_down: boolean
        }
      } = await ExternalApi('/emby/userLogin', {
        username: body.username,
        password: body.pw,
        ...emby_devices,
      }).catch((error) => {
        this.logger.error(`error login external ${error} ${body.username} `)
        return null
      })

      if (!data) {
        return res.status(500).send('外部验证错误 请稍后再试')
      }

      if (data.code != 200) {
        return res.status(data.code).send(data.message)
      }

      user_id = data.data.user_id

      let user_has: any = await this.model.query.user.findFirst({
        columns: {
          id: true,
        },
        where: db.eq(db.schema.user.id, user_id),
      })

      let user_data_update = {
        username: data.data.username,
        folders: data.data.folders,
        is_can_down: data.data.is_can_down,
      }

      if (user_has) {
        await this.model.update(db.schema.user).set(user_data_update).where(db.eq(db.schema.user.id, user_id))
      } else {
        await this.model.insert(db.schema.user).values({
          id: user_id,
          ...user_data_update,
        })
      }
    } else {
      let user: any = await this.model.query.user.findFirst({
        columns: {
          id: true,
          password: true,
          is_disable: true,
        },
        where: db.and(db.eq(db.schema.user.username, body.username), db.isNull(db.schema.user.deleted_at)),
      })

      let password = user?.password
      if (!user || (password && !(await argon2.verify(user.password, body.pw)))) {
        this.logger.error(`error login ${body.username} - ${ua} = ${emby_authorization}`)
        return res.status(401).send('用户名或密码错误')
      }

      if (user.is_disable) {
        this.logger.error(`user disable login ${body.username} = ${emby_authorization}`)
        return res.status(401).send('账号已被封禁')
      }

      user_id = user.id
    }

    let token = randomString(30)

    await this.model.insert(db.schema.token).values({
      token,
      user_id,
      device_client: emby_devices.client,
      device_name: emby_devices.device,
      device_id: emby_devices.deviceid,
      device_version: emby_devices.version,
    })

    if (user_id > Number(process.env?.APP_AUTH_NUMBER || 10)) {
      return res.status(401).send('登陆失败 已超授权数')
    }

    let emby_user = await this.TransformService.User(user_id)

    return res.code(200).send({
      User: emby_user,
      SessionInfo: {
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
        PlayableMediaTypes: [],
        PlaylistIndex: 0,
        PlaylistLength: 0,
        Id: emby_user.Id,
        ServerId: emby_user.ServerId,
        UserId: emby_user.Id,
        UserName: emby_user.Name,
        Client: emby_devices.client,
        LastActivityDate: emby_user.LastActivityDate,
        DeviceName: emby_devices.device,
        InternalDeviceId: 0,
        DeviceId: emby_devices.deviceid,
        ApplicationVersion: emby_devices.version,
        SupportedCommands: [],
        SupportsRemoteControl: false,
      },
      AccessToken: token,
      ServerId: emby_user.ServerId,
    })
  }

  @Get(':emby_user_id')
  async UserBase(@Req() req: any) {
    return await this.TransformService.User(req.user_id)
  }

  @Get(':emby_user_id/views')
  async UserViews(@Req() req: any) {
    let rows = await this.TransformService.getUserLibrary(req.user_id)
    return this.EmbyService.ItemResponse(rows)
  }

  @Get(':emby_user_id/items')
  async UserItems(@Req() req: any, @Query() query: RequestDto.UserItems) {
    let search = {
      ...query,
      IncludeItemTypes: query.includeitemtypes?.split(',') || [],
      Fields: query.fields?.split(','),
      Filters: query.filters?.split(','),
      GenreIds: query.genreids?.split(','),
    }

    let query_search_term = query.searchterm || query.namestartswith
    // 以类型 合集 查询
    if (!query_search_term && (search.IncludeItemTypes.includes('Tag') || search.IncludeItemTypes.includes('BoxSet'))) {
      return this.EmbyService.ItemResponse()
    }

    // 搜索 列表展示
    if (query.sortby == 'IsFavoriteOrLiked,Random') {
      let rows: any = [],
        default_search_lists = JSON.parse(process.env?.SEARCH_DEFAULT_LIST || `{"欢迎来到 ${this.EmbyService.ServerName()}": 0}`)

      for (let default_search_list_name in default_search_lists) {
        rows.push({
          Id: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_LIST, default_search_lists[default_search_list_name]),
          Name: default_search_list_name,
        })
      }

      return this.EmbyService.ItemResponse(rows, 0)
    }

    // 搜索提交
    if (query_search_term && process.env.API_EXTERNAL) {
      await ExternalApi(`/emby/userSearch`, {
        user_id: req.user_id,
        search: query_search_term,
      }).catch(() => null)
    }

    let data = await this.TransformService.VideoList(req.user_id, search)
    return this.EmbyService.ItemResponse(data.datas, data.count)
  }

  @Get(':emby_user_id/items/resume')
  async UserItemsResume(@Req() req: any) {
    // todo: 优化查询方式

    let where: any = [
      // prettier-ignore
      db.eq(db.schema.user_video_record.user_id, req.user_id),
      db.isNotNull(db.schema.user_video_record.play_seconds),
    ]

    let search_parent_value = req.query.parentid
    if (search_parent_value) {
      let parents = this.EmbyService.ItemIdParse(search_parent_value)

      if (parents?.[0] == EMBY_ITEM_ID_TYPE_VIDEO_LIBRARY) {
        where.push(db.eq(db.schema.library.id, parents[1]))
      }
    }

    // prettier-ignore
    let datas = await this.model
      .select({
        record_id: db.schema.user_video_record.id,
        video_type: db.schema.video_list.video_type,
        video_list_id: db.schema.user_video_record.video_list_id,
        video_season_id: db.schema.user_video_record.video_season_id,
        video_episode_id: db.schema.user_video_record.video_episode_id,
        video_title: db.schema.video_list.title,
        video_date_air: db.schema.video_list.date_air,
        season_title: db.schema.video_season.title,
        season_number: db.schema.video_season.season_number,
        episode_title: db.schema.video_episode.title,
        episode_number: db.schema.video_episode.episode_number,
        play_second: db.schema.user_video_record.play_seconds,
        is_complete: db.schema.user_video_record.is_complete,
      })
      .from(db.schema.user_video_record)
      .leftJoin(db.schema.video_list, db.eq(db.schema.video_list.id, db.schema.user_video_record.video_list_id))
      .leftJoin(db.schema.video_season, db.eq(db.schema.video_season.id, db.schema.user_video_record.video_season_id))
      .leftJoin(db.schema.video_episode, db.eq(db.schema.video_episode.id, db.schema.user_video_record.video_episode_id))
      .leftJoin(db.schema.library, db.eq(db.schema.library.id, db.schema.video_list.video_library_id))
      .where(db.and(...where))
      .orderBy(db.desc(db.schema.user_video_record.updated_at))
      .limit(30)

    let video_ids: Array<number> = []

    let rows: any = []
    for (let data of datas) {
      let video_list_id = data.video_list_id
      if (video_ids.includes(video_list_id)) {
        continue
      }
      video_ids.push(video_list_id)

      let data_year = Number(dayjs(data.video_date_air).format('YYYY')),
        user_video_record = await this.TransformService.formatUserVideoRecord(data),
        data_video_id = this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_LIST, video_list_id)

      if (data.video_type == VIDEO_TYPE_TV) {
        let data_episode_id = this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_EPISODE, data.video_episode_id as number)
        rows.push({
          Name: data.episode_title,
          Id: data_episode_id,
          CanDelete: false,
          RunTimeTicks: 0,
          ProductionYear: data_year,
          IndexNumber: data.episode_number,
          ParentIndexNumber: data.season_number,
          IsFolder: false,
          Type: 'Episode',
          ParentBackdropItemId: data_video_id,
          ParentBackdropImageTags: [],
          UserData: {
            PlayedPercentage: 0,
            PlaybackPositionTicks: user_video_record.play_ms,
            PlayCount: 0,
            IsFavorite: false,
            Played: user_video_record.is_complete,
          },
          SeriesName: data.video_title,
          SeriesId: data_video_id,
          SeriesPrimaryImageTag: '',
          SeasonName: data.season_title,
          SeasonId: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_SEASON, data.video_season_id as number),
          PrimaryImageAspectRatio: 1.7,
          ImageTags: {
            [VideoImageTypes.TYPE_PRIMARY]: data_episode_id,
          },
          BackdropImageTags: [],
          MediaType: 'Video',
        })
      } else {
        rows.push({
          Name: data.video_title,
          Id: data_video_id,
          CanDelete: false,
          RunTimeTicks: 0,
          ProductionYear: data_year,
          IsFolder: false,
          Type: 'Movie',
          UserData: {
            PlayedPercentage: 0,
            PlaybackPositionTicks: user_video_record.play_ms,
            PlayCount: 0,
            IsFavorite: false,
            Played: user_video_record.is_complete,
          },
          PrimaryImageAspectRatio: 0.6,
          ImageTags: {
            [VideoImageTypes.TYPE_PRIMARY]: data_video_id,
          },
          BackdropImageTags: [],
          MediaType: 'Video',
        })
      }
    }

    return this.EmbyService.ItemResponse(rows)
  }

  @Get(':emby_user_id/items/latest')
  async UserItemsLatest(@Req() req: any, @Query() query: RequestDto.UserItemsLatest) {
    return (await this.TransformService.VideoList(req.user_id, query)).datas
  }

  @Get(':emby_user_id/items/:emby_item_id')
  async UserItemsInfo(@Req() req: any, @Param('emby_item_id') emby_item_id: string) {
    return this.TransformService.ItemInfo(req.user_id, emby_item_id)
  }

  @Get(':emby_user_id/items/:emby_item_id/LocalTrailers')
  async UserItemsInfoLocalTrailers(@Req() req: any, @Param('emby_item_id') emby_item_id: string) {
    return []
  }

  @Get(':emby_user_id/items/:emby_item_id/SpecialFeatures')
  async UserItemsInfoSpecialFeatures(@Req() req: any, @Param('emby_item_id') emby_item_id: string) {
    return []
  }

  @Post(':emby_user_id/items/:emby_item_id/HideFromResume')
  async UserItemsInfoHideFromResume(@Req() req: any, @Param('emby_item_id') emby_item_id: string) {
    let emby_item = this.EmbyService.ItemIdParse(emby_item_id)
    if (!emby_item) {
      throw new NotFoundException()
    }

    let user_id = req.user_id,
      emby_item_type = emby_item[0],
      emby_item_value = emby_item[1]

    let video_list_id: any = emby_item_value
    if (emby_item_type == EMBY_ITEM_ID_TYPE_VIDEO_EPISODE) {
      video_list_id = (
        (await this.model.query.video_episode.findFirst({
          columns: {
            video_list_id: true,
          },
          where: db.eq(db.schema.video_episode.id, emby_item_value),
        })) as any
      ).video_list_id
    }

    await this.model
      .update(db.schema.user_video_record)
      .set({
        play_seconds: null,
      })
      .where(
        // prettier-ignore
        db.and(
          db.eq(db.schema.user_video_record.user_id, user_id),
          db.eq(db.schema.user_video_record.video_list_id, video_list_id),
        ),
      )

    return {
      IsFavorite: false,
      Played: false,
      PlayCount: 0,
    }
  }

  @All(':emby_user_id/FavoriteItems/:emby_item_id/:is_delete?')
  async UserFavoriteitems(@Req() req: any, @Param('emby_item_id') emby_item_id: string) {
    if (!['POST', 'DELETE'].includes(req.method)) {
      throw new MethodNotAllowedException()
    }

    let emby_item = this.EmbyService.ItemIdParse(emby_item_id)
    if (!emby_item) {
      throw new NotFoundException()
    }

    let user_id = req.user_id,
      is_favorite = false,
      emby_item_type = emby_item[0],
      emby_item_value = emby_item[1]

    await this.model.delete(db.schema.favorites).where(
      db.and(
        // prettier-ignore
        db.eq(db.schema.favorites.user_id, user_id),
        db.eq(db.schema.favorites.relation_type, emby_item_type),
        db.eq(db.schema.favorites.relation_id, emby_item_value),
      ),
    )

    let row = {
      user_id,
      relation_type: emby_item_type,
      relation_id: emby_item_value,
    }

    if (req.method == 'POST') {
      await this.model.insert(db.schema.favorites).values(row)
      is_favorite = true
    }

    if (process.env.API_EXTERNAL) {
      await ExternalApi('/emby/userFavorite', {
        ...row,
        is_favorite,
      }).catch(() => null)
    }

    /**
     * todo: 对于电视类型时 是否完成判断不准确
     * 对于 hills播放器这种一起使用的来说 会存在显示问题
     */
    let user_video_record = await this.TransformService.formatUserVideoRecord()

    if (emby_item_type == EMBY_ITEM_ID_TYPE_VIDEO_LIST) {
      user_video_record = await this.TransformService.getUserVideoRecord(user_id, emby_item_value)
    }

    if (emby_item_type == EMBY_ITEM_ID_TYPE_VIDEO_EPISODE) {
      user_video_record = await this.TransformService.getUserVideoRecord(user_id, null, emby_item_value)
    }

    return {
      IsFavorite: is_favorite,
      PlayCount: 0,
      PlaybackPositionTicks: user_video_record.play_ms,
      Played: user_video_record.is_complete,
    }
  }

  @All(':emby_user_id/PlayedItems/:emby_item_id/:is_delete?')
  async UserPlayedItems(@Req() req: any, @Param('emby_item_id') emby_item_id: string) {
    if (!['POST', 'DELETE'].includes(req.method)) {
      throw new MethodNotAllowedException()
    }

    let emby_item = this.EmbyService.ItemIdParse(emby_item_id)
    if (!emby_item) {
      throw new NotFoundException()
    }

    let user_id = req.user_id,
      is_played = false,
      emby_item_type = emby_item[0],
      emby_item_value = emby_item[1]

    // todo: played change all

    let where: any = [db.eq(db.schema.user_video_record.user_id, user_id)]
    if (emby_item_type == EMBY_ITEM_ID_TYPE_VIDEO_LIST) {
      where.push(db.eq(db.schema.user_video_record.video_list_id, emby_item_value))
      where.push(db.isNull(db.schema.user_video_record.video_episode_id))
    }

    if (emby_item_type == EMBY_ITEM_ID_TYPE_VIDEO_EPISODE) {
      where.push(db.eq(db.schema.user_video_record.video_episode_id, emby_item_value))
    }

    if (req.method == 'POST') {
      is_played = true
    }

    let user_video_record = await this.model.query.user_video_record.findFirst({
      columns: {
        play_seconds: true,
        is_complete: true,
      },
      where: db.and(...where),
    })

    if (user_video_record) {
      await this.model
        .update(db.schema.user_video_record)
        .set({
          is_complete: is_played,
          play_seconds: is_played ? 0 : user_video_record.play_seconds,
        })
        .where(db.and(...where))
    }

    let format_user_video_record = await this.TransformService.formatUserVideoRecord(user_video_record)

    let is_favorite = await this.model.query.favorites.findFirst({
      columns: {
        id: true,
      },
      where: db.and(
        // prettier-ignore
        db.eq(db.schema.favorites.user_id, user_id),
        db.eq(db.schema.favorites.relation_type, emby_item_type),
        db.eq(db.schema.favorites.relation_id, emby_item_value),
      ),
    })

    return {
      IsFavorite: Boolean(is_favorite?.id),
      PlayCount: 0,
      // todo: 视频时常超出正常时常
      PlaybackPositionTicks: format_user_video_record.play_ms,
      Played: is_played,
    }
  }
}
