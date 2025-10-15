import { Controller, Inject, Req, Res, All, Get, Post, Delete, Put, Param, Query, Body, MethodNotAllowedException, NotFoundException } from '@nestjs/common'

import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import { Logger } from 'winston'

import * as RequestDto from '@/controller/emby/request.dto'
import { IgnoreAuth } from '@/controller/emby/auth.decorator'
import * as argon2 from 'argon2'

import * as db from '@/db'
import { MySql2Database } from 'drizzle-orm/mysql2'
import { EmbyService, EMBY_DEFAULT_TIME, EMBY_ITEM_ID_TYPE_VIDEO_LIBRARY, EMBY_ITEM_ID_TYPE_VIDEO_LIST } from '@/controller/emby/emby.service'
import { TransformService } from '@/controller/emby/transform.service'
import { randomString } from '@/utils/random'

import { ExternalApi } from '@/utils/request'

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

    return res.send({
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
    let user_id = req.user_id

    let user_info: any = await this.model.query.user.findFirst({
      columns: {
        folders: true,
      },
      where: db.eq(db.schema.user.id, user_id),
    })

    let user_folders = JSON.parse(user_info.folders || '[]')

    let libraries: any = await this.model.query.library.findMany({
      columns: {
        id: true,
        name: true,
      },
      where: db.and(db.inArray(db.schema.library.id, user_folders)),
      orderBy: db.asc(db.schema.library.id),
    })

    let emby_server_id = this.EmbyService.Id()

    let rows: any = []
    for (let library of libraries) {
      let library_name = library.name,
        library_id = this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_LIBRARY, library.id)

      rows.push({
        Name: library_name,
        ServerId: emby_server_id,
        Id: library_id,
        Guid: library_id,
        Etag: library_id,
        DateCreated: EMBY_DEFAULT_TIME,
        DateModified: EMBY_DEFAULT_TIME,
        CanDelete: false,
        CanDownload: false,
        PresentationUniqueKey: library_id,
        SortName: library_name,
        ForcedSortName: library_name,
        ExternalUrls: [],
        Taglines: [],
        RemoteTrailers: [],
        ProviderIds: {},
        IsFolder: true,
        ParentId: '0',
        Type: 'CollectionFolder',
        UserData: {
          PlaybackPositionTicks: 0,
          IsFavorite: false,
          Played: false,
        },
        ChildCount: 1,
        DisplayPreferencesId: library_id,
        PrimaryImageAspectRatio: 1,
        ImageTags: {
          Primary: library_id,
        },
        BackdropImageTags: [],
        LockedFields: [],
        LockData: false,
      })
    }

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

    let query_search_term = query.searchterm
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
  async UserItemsResume() {
    return this.EmbyService.ItemResponse()
  }

  @Get(':emby_user_id/items/latest')
  async UserItemsLatest(@Req() req: any, @Query() query: RequestDto.UserItemsLatest) {
    return (await this.TransformService.VideoList(req.user_id, query)).datas
  }

  @Get(':emby_user_id/items/:emby_item_id')
  async UserItemsInfo(@Req() req: any, @Param('emby_item_id') emby_item_id: string) {
    return this.TransformService.ItemInfo(req.user_id, emby_item_id)
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

    await ExternalApi('/emby/userFavorite', {
      ...row,
      is_favorite,
    }).catch(() => null)

    return {
      IsFavorite: is_favorite,
      PlayCount: 0,
      PlaybackPositionTicks: 0,
      Played: true,
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

    // todo: played

    if (req.method == 'POST') {
      is_played = true
    }

    return {
      IsFavorite: false,
      PlayCount: 0,
      PlaybackPositionTicks: 0,
      Played: is_played,
    }
  }
}
