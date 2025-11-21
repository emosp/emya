import { Inject, Injectable } from '@nestjs/common'

import {
  EmbyService,
  EMBY_ITEM_ID_TYPE_VIDEO_LIST,
  EMBY_ITEM_ID_TYPE_VIDEO_EPISODE,
  EMBY_ITEM_ID_TYPE_VIDEO_SEASON,
  EMBY_ITEM_ID_TYPE_VIDEO_LIBRARY,
  EMBY_DEFAULT_TIME,
} from '@/controller/emby/emby.service'
import { MySql2Database } from 'drizzle-orm/mysql2'
import * as db from '@/db'
import { dayjs, formatTimeToEmby } from '@/utils/dayjs'

import { encode } from '@/utils/hashids'
import { FormatVideo } from '@/utils/metadata'
import { VideoTypes } from '@/db/schema/video_list'
import { VideoImageTypes } from '@/db/schema/video_image'

@Injectable()
export class TransformService {
  constructor(
    @Inject('REQUEST') private readonly request: any,
    @Inject('DB') private model: MySql2Database<typeof db.schema>,
    private EmbyService: EmbyService,
  ) {}

  async User(user_id: number) {
    let emby_user_id = encode(user_id),
      emby_user_time = formatTimeToEmby()

    let user_model: any = await this.model.query.user.findFirst({
      columns: {
        username: true,
        is_can_down: true,
        folders: true,
      },
      where: db.eq(db.schema.user.id, user_id),
    })

    let user_folders = JSON.parse(user_model.folders || '[]').map((folder: number) => folder.toString())

    return {
      Name: user_model.username,
      ServerId: this.EmbyService.Id(),
      Prefix: 'E',
      DateCreated: emby_user_time,
      Id: emby_user_id,
      HasPassword: true,
      HasConfiguredPassword: true,
      LastLoginDate: emby_user_time,
      LastActivityDate: emby_user_time,
      Configuration: {
        AudioLanguagePreference: '',
        PlayDefaultAudioTrack: true,
        DisplayMissingEpisodes: false,
        SubtitleMode: 'Smart',
        OrderedViews: user_folders,
        LatestItemsExcludes: [],
        SearchExcludes: [],
        MyMediaExcludes: [],
        HidePlayedInLatest: false,
        HidePlayedInMoreLikeThis: false,
        HidePlayedInSuggestions: false,
        RememberAudioSelections: false,
        RememberSubtitleSelections: false,
        EnableNextEpisodeAutoPlay: false,
        ResumeRewindSeconds: 0,
        IntroSkipMode: 'None',
        EnableLocalPassword: false,
      },
      Policy: {
        IsAdministrator: false,
        IsHidden: true,
        IsHiddenRemotely: true,
        IsHiddenFromUnusedDevices: true,
        IsDisabled: false,
        LockedOutDate: 0,
        AllowTagOrRating: false,
        BlockedTags: [],
        IsTagBlockingModeInclusive: false,
        IncludeTags: [],
        EnableUserPreferenceAccess: false,
        AccessSchedules: [],
        BlockUnratedItems: [],
        EnableRemoteControlOfOtherUsers: false,
        EnableSharedDeviceControl: false,
        EnableRemoteAccess: true,
        EnableLiveTvManagement: false,
        EnableLiveTvAccess: true,
        EnableMediaPlayback: true,
        EnableAudioPlaybackTranscoding: false,
        EnableVideoPlaybackTranscoding: false,
        EnablePlaybackRemuxing: false,
        EnableContentDeletion: true,
        RestrictedFeatures: [],
        EnableContentDeletionFromFolders: [],
        EnableContentDownloading: user_model.is_can_down,
        EnableSubtitleDownloading: user_model.is_can_down,
        EnableSubtitleManagement: false,
        EnableSyncTranscoding: false,
        EnableMediaConversion: false,
        EnabledChannels: [],
        EnableAllChannels: true,
        EnabledFolders: [],
        EnableAllFolders: true,
        InvalidLoginAttemptCount: 0,
        EnablePublicSharing: false,
        RemoteClientBitrateLimit: 0,
        AuthenticationProviderId: 'emya',
        ExcludedSubFolders: [],
        SimultaneousStreamLimit: 0,
        EnabledDevices: [],
        EnableAllDevices: true,
        AllowCameraUpload: false,
        AllowSharingPersonalItems: false,
      },
      HasConfiguredEasyPassword: false,
    }
  }

  async GetVideoListTitleById(video_list_id: any) {
    return (
      (await this.model.query.video_list.findFirst({
        columns: {
          title: true,
        },
        where: db.eq(db.schema.video_list.id, video_list_id),
      })) as any
    )?.title
  }

  async getUserVideoRecord(user_id: number, video_list_id: null | number = null, video_episode_id: null | number = null) {
    let where: any = [db.eq(db.schema.user_video_record.user_id, user_id)]

    if (video_list_id) {
      where.push(db.eq(db.schema.user_video_record.video_list_id, video_list_id))
    }

    if (video_episode_id) {
      where.push(db.eq(db.schema.user_video_record.video_episode_id, video_episode_id))
    }

    let data = await this.model.query.user_video_record.findFirst({
      columns: {
        play_seconds: true,
        is_complete: true,
        video_media_id: true,
      },
      where: db.and(...where),
    })

    let file_second: number = 0

    if (data?.video_media_id) {
      file_second = (
        (await this.model.query.video_media.findFirst({
          columns: {
            file_second: true,
          },
          where: db.eq(db.schema.video_media.id, data.video_media_id),
        })) as any
      ).file_second
    }

    return await this.formatUserVideoRecord(data, file_second)
  }

  async formatUserVideoRecord(data: any = null, media_second: number | null = 0) {
    let play_ms = 0,
      is_complete = false,
      percentage = 0

    if (data) {
      let play_seconds = data?.play_seconds || 0
      play_ms = play_seconds * 10000000
      is_complete = Boolean(data?.is_complete)
      if (media_second && play_seconds) {
        percentage = parseFloat(((play_seconds / media_second) * 100).toFixed(15))
      }
    }

    return {
      play_ms,
      is_complete,
      percentage,
    }
  }

  async getUserLibrary(user_id: number) {
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

    return rows
  }

  async VideoList(user_id: number, search: any = {}) {
    let sql_db = this.model
      .select({
        id: db.schema.video_list.id,
        tmdb_id: db.schema.video_list.tmdb_id,
        video_type: db.schema.video_list.video_type,
        title: db.schema.video_list.title,
        date_air: db.schema.video_list.date_air,
        created_at: db.schema.video_list.created_at,
      })
      .from(db.schema.video_list)

    let sql_conditions: any = [
      // prettier-ignore
      db.isNull(db.schema.video_list.deleted_at),
    ]

    let user_folders: any = (
      await this.model.query.user.findFirst({
        columns: {
          folders: true,
        },
        where: db.eq(db.schema.user.id, user_id),
      })
    )?.folders
    sql_conditions.push(db.inArray(db.schema.video_list.video_library_id, JSON.parse(user_folders || '[]')))

    let search_parent_value = search.parentid
    if (search_parent_value) {
      let parents = this.EmbyService.ItemIdParse(search_parent_value)

      // hills 中会使用 ParentId 切换集数
      if (parents) {
        sql_conditions.push(db.eq(db.schema.video_list.video_library_id, parents[1]))
      }
    }

    let search_searchterm = search.searchterm || search.namestartswith
    if (search_searchterm) {
      sql_conditions.push(
        db.or(
          // prettier-ignore
          db.like(db.schema.video_list.title, `%${search_searchterm}%`),
          db.like(db.schema.video_list.origin_title, `%${search_searchterm}%`),
        ),
      )
    }

    // todo: GenreIds
    let search_genre_ids = search.GenreIds

    let search_filters = search.Filters || []
    if (search_filters.includes('IsFavorite')) {
      sql_db.innerJoin(
        db.schema.favorites,
        db.and(
          // prettier-ignore
          db.eq(db.schema.favorites.relation_type, EMBY_ITEM_ID_TYPE_VIDEO_LIST),
          db.eq(db.schema.favorites.relation_id, db.schema.video_list.id),
          db.eq(db.schema.favorites.user_id, user_id),
        ),
      )

      let search_include_item_types = search.IncludeItemTypes || [],
        where_video_types: any = []
      if (search_include_item_types.includes('Series')) {
        where_video_types.push(VideoTypes.VIDEO_TYPE_TV)
      }
      if (search_include_item_types.includes('Movie')) {
        where_video_types.push(VideoTypes.VIDEO_TYPE_MOVIE)
      }

      if (where_video_types.length) {
        sql_conditions.push(db.inArray(db.schema.video_list.video_type, where_video_types))
      } else {
        // 收藏列表 只支持 电影 和 电视
        sql_conditions.push(db.eq(db.schema.video_list.id, 0))
      }
    }

    sql_db.where(db.and(...sql_conditions))

    let sortby = search.sortby || '',
      sort_by_name: any = db.schema.video_list.updated_at
    if (sortby.includes('DateCreated')) {
      sort_by_name = db.schema.video_list.id
    }
    if (sortby.includes('ProductionYear') || sortby.includes('PremiereDate')) {
      sort_by_name = db.schema.video_list.date_air
    }

    let search_sortorder = search.sortorder || 'Descending'
    sql_db.orderBy(search_sortorder == 'Descending' ? db.desc(sort_by_name) : db.asc(sort_by_name))

    let search_offset = Number(search.startindex || 0)
    if (search_offset > 0) {
      sql_db.offset(search_offset)
    }
    sql_db.limit(Number(search.limit || 20))

    let rows = await sql_db,
      count = (
        await this.model
          .select({
            count: db.count(),
          })
          .from(db.schema.video_list)
          .where(db.and(...sql_conditions))
      )[0]['count']

    let server_id = this.EmbyService.Id()

    let datas: any = []
    for (let row of rows) {
      let is_movie = row.video_type == VideoTypes.VIDEO_TYPE_MOVIE,
        row_id = this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_LIST, row.id)

      datas.push({
        Name: row.title,
        ServerId: server_id,
        Id: row_id,
        // Etag: row_id,
        DateCreated: formatTimeToEmby(row.created_at),
        // SortName: row.title,
        Path: this.EmbyService.DefaultPath(),
        // Overview: '',
        Genres: [],
        // ParentId: 'emos',
        People: [],
        GenreItems: [],
        // AirDays: [],
        ProductionYear: Number(dayjs(row.date_air).format('YYYY')),
        ProviderIds: {
          Tmdb: row.tmdb_id,
        },
        IsFolder: !is_movie,
        Type: is_movie ? 'Movie' : 'Series',
        UserData: {
          // UnplayedItemCount: 0,
          PlaybackPositionTicks: 0,
          PlayCount: 0,
          IsFavorite: false,
          Played: false,
        },
        // RecursiveItemCount: 0,
        // ChildCount: 0,
        PrimaryImageAspectRatio: 0.67,
        ImageTags: {
          [VideoImageTypes.TYPE_PRIMARY]: row_id,
        },
        BackdropImageTags: [],
        MediaType: 'Video',
        CanDelete: false,
        CanDownload: false,
      })
    }

    return {
      datas,
      count,
    }
  }

  async ItemInfo(user_id: number, emby_item_id: string): Promise<{} | null> {
    let emby_item = this.EmbyService.ItemIdParse(emby_item_id)
    if (!emby_item) {
      return null
    }

    let emby_item_type = emby_item[0],
      emby_item_value = emby_item[1],
      emby_item_data = {}

    let has_favorited = Boolean(
      await this.model.query.favorites.findFirst({
        columns: {
          id: true,
        },
        where: db.and(
          // prettier-ignore
          db.eq(db.schema.favorites.relation_type, emby_item_type),
          db.eq(db.schema.favorites.relation_id, emby_item_value),
          db.eq(db.schema.favorites.user_id, user_id),
        ),
      }),
    )

    let user = await this.model.query.user.findFirst({
        columns: {
          is_can_down: true,
        },
        where: db.eq(db.schema.user.id, user_id),
      }),
      user_is_can_down = Boolean(user?.is_can_down)

    switch (emby_item_type) {
      case EMBY_ITEM_ID_TYPE_VIDEO_LIBRARY:
        // todo: user library
        let video_library = await this.model.query.library.findFirst({
          columns: {
            name: true,
          },
          where: db.and(
            // prettier-ignore
            db.eq(db.schema.library.id, emby_item_value),
            db.isNull(db.schema.library.deleted_at),
          ),
        })

        if (!video_library) {
          return null
        }

        emby_item_data = {
          Name: video_library.name,
          Id: emby_item_id,
          Guid: emby_item_id,
          Etag: emby_item_id,
          // DateCreated: formatTimeToEmby(video_library.created_at),
          // DateModified: formatTimeToEmby(video_library.updated_at),
          CanDelete: false,
          CanDownload: false,
          PresentationUniqueKey: emby_item_id,
          // SupportsSync: true,
          SortName: video_library.name,
          ForcedSortName: video_library.name,
          // ExternalUrls: [],
          // Taglines: [],
          // RemoteTrailers: [],
          // ProviderIds: {},
          IsFolder: true,
          // ParentId: 'emya',
          Type: 'CollectionFolder',
          UserData: {
            PlaybackPositionTicks: 0,
            IsFavorite: false,
            Played: false,
          },
          // ChildCount: 0,
          // DisplayPreferencesId: emby_item_id,
          PrimaryImageAspectRatio: 1.7,
          ImageTags: {
            [VideoImageTypes.TYPE_PRIMARY]: emby_item_id,
          },
          BackdropImageTags: [],
          // LockedFields: [],
          LockData: true,
          // Subviews: [],
        }
        break

      case EMBY_ITEM_ID_TYPE_VIDEO_LIST:
        let video_list = await this.model.query.video_list.findFirst({
          where: db.and(
            // prettier-ignore
            db.eq(db.schema.video_list.id, emby_item_value),
            db.isNull(db.schema.video_list.deleted_at),
          ),
        })

        if (!video_list) {
          return null
        }

        let video_type = video_list.video_type,
          is_movie = video_type == VideoTypes.VIDEO_TYPE_MOVIE,
          video_list_child_count = 0,
          user_video_record_list = await this.formatUserVideoRecord()

        if (is_movie) {
          user_video_record_list = await this.getUserVideoRecord(user_id, video_list.id)
        } else {
          video_list_child_count = await this.model.$count(
            db.schema.video_season,
            db.and(
              // prettier-ignore
              db.eq(db.schema.video_season.video_list_id, emby_item_value),
              db.isNull(db.schema.video_season.deleted_at),
            ),
          )
        }

        emby_item_data = {
          Name: video_list.title,
          OriginalTitle: video_list.origin_title,
          Id: emby_item_id,
          DateCreated: formatTimeToEmby(video_list.created_at),
          DateModified: formatTimeToEmby(video_list.updated_at),
          CanDelete: false,
          CanDownload: user_is_can_down,
          PresentationUniqueKey: emby_item_id,
          SupportsSync: true,
          SortName: video_list.title,
          ForcedSortName: video_list.title,
          ExternalUrls: [],
          MediaSources: is_movie ? await this.VideoMedia(video_list.id, null, true, null) : [],
          ProductionLocations: [],
          Path: `/${video_type}`,
          Overview: video_list.description,
          Taglines: [],
          Genres: [],
          Size: 0,
          FileName: video_list.title,
          ProductionYear: Number(dayjs(video_list.date_air).format('YYYY')),
          RemoteTrailers: [],
          ProviderIds: {},
          IsFolder: !is_movie,
          ParentId: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_LIBRARY, video_list.video_library_id),
          Type: is_movie ? 'Movie' : 'Series',
          People: [],
          Studios: [],
          GenreItems: [],
          TagItems: [],
          LocalTrailerCount: 0,
          UserData: {
            // 'UnplayedItemCount'     : 0,
            PlayedPercentage: user_video_record_list.percentage,
            PlaybackPositionTicks: user_video_record_list.play_ms,
            PlayCount: 0,
            IsFavorite: has_favorited,
            Played: user_video_record_list.is_complete,
          },
          ChildCount: video_list_child_count,
          RecursiveItemCount: video_list_child_count,
          DisplayPreferencesId: emby_item_id,
          AirDays: [],
          PrimaryImageAspectRatio: 0.67,
          MediaStreams: [],
          PartCount: 1,
          DisplayOrder: 'Aired',
          ImageTags: {
            [VideoImageTypes.TYPE_PRIMARY]: emby_item_id,
          },
          BackdropImageTags: [],
          Chapters: [],
          MediaType: 'Video',
          LockedFields: [],
          LockData: true,
        }

        let video_list_tmdb_id = video_list.tmdb_id
        if (video_list_tmdb_id) {
          emby_item_data['ExternalUrls'].push({
            Name: 'TheMovieDb',
            Url: `https://www.themoviedb.org/${video_type}/${video_list_tmdb_id}`,
          })
          emby_item_data['ProviderIds']['Tmdb'] = video_list_tmdb_id
        }
        break

      case EMBY_ITEM_ID_TYPE_VIDEO_SEASON:
        let video_season = await this.model.query.video_season.findFirst({
          where: db.and(
            // prettier-ignore
            db.eq(db.schema.video_season.id, emby_item_value),
            db.isNull(db.schema.video_season.deleted_at),
          ),
        })
        if (!video_season) {
          return null
        }

        let video_season_video_title = await this.GetVideoListTitleById(video_season.video_list_id)

        emby_item_data = {
          Name: video_season.title,
          Id: emby_item_id,
          DateCreated: formatTimeToEmby(video_season.created_at),
          DateModified: formatTimeToEmby(video_season.updated_at),
          CanDelete: false,
          CanDownload: user_is_can_down,
          PresentationUniqueKey: emby_item_id,
          SupportsSync: true,
          SortName: video_season.title,
          ForcedSortName: video_season.title,
          PremiereDate: formatTimeToEmby(video_season.date_air),
          ExternalUrls: [],
          Path: `/${emby_item_id}`,
          Overview: video_season.description,
          Taglines: [],
          Genres: [],
          FileName: video_season.season_number.toString(),
          ProductionYear: Number(dayjs(video_season.date_air).format('YYYY')),
          IndexNumber: video_season.season_number,
          RemoteTrailers: [],
          ProviderIds: {},
          IsFolder: true,
          ParentId: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_LIST, video_season.video_list_id),
          Type: 'Season',
          People: [],
          Studios: [],
          GenreItems: [],
          TagItems: [],
          // ParentBackdropItemId: '',
          ParentBackdropImageTags: [],
          UserData: {
            // 'UnplayedItemCount': 0,
            PlaybackPositionTicks: 0,
            PlayCount: 0,
            IsFavorite: has_favorited,
            Played: false,
          },
          ChildCount: await this.model.$count(
            db.schema.video_episode,
            db.and(
              // prettier-ignore
              db.eq(db.schema.video_episode.video_season_id, emby_item_value),
              db.isNull(db.schema.video_episode.deleted_at),
            ),
          ),
          SeriesId: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_LIST, video_season.video_list_id),
          SeriesName: video_season_video_title,
          DisplayPreferencesId: '',
          PrimaryImageAspectRatio: 0.6,
          SeriesPrimaryImageTag: '',
          ImageTags: {
            [VideoImageTypes.TYPE_PRIMARY]: emby_item_id,
          },
          BackdropImageTags: [],
          LockedFields: [],
          LockData: true,
        }
        break

      case EMBY_ITEM_ID_TYPE_VIDEO_EPISODE:
        let video_episode = await this.model.query.video_episode.findFirst({
          where: db.and(
            // prettier-ignore
            db.eq(db.schema.video_episode.id, emby_item_value),
            db.isNull(db.schema.video_episode.deleted_at),
          ),
        })

        if (!video_episode) {
          return null
        }

        let video_episode_video_title = await this.GetVideoListTitleById(video_episode.video_list_id)

        let video_episode_season_data: any = await this.model.query.video_season.findFirst({
          columns: {
            title: true,
            season_number: true,
          },
          where: db.eq(db.schema.video_season.id, video_episode.video_season_id),
        })

        let user_video_record_episode = await this.getUserVideoRecord(user_id, video_episode.video_list_id, video_episode.id)

        emby_item_data = {
          Name: video_episode.title,
          Id: emby_item_id,
          DateCreated: formatTimeToEmby(video_episode.created_at),
          DateModified: formatTimeToEmby(video_episode.updated_at),
          CanDelete: false,
          CanDownload: user_is_can_down,
          PresentationUniqueKey: emby_item_id,
          SupportsSync: true,
          SortName: video_episode.title,
          ForcedSortName: video_episode.title,
          PremiereDate: formatTimeToEmby(video_episode.date_air),
          ExternalUrls: [],
          MediaSources: await this.VideoMedia(video_episode.video_list_id, video_episode.id, true, null),
          Path: `/${emby_item_id}`,
          Overview: video_episode.description,
          Taglines: [],
          Genres: [],
          FileName: video_episode.episode_number.toString(),
          ProductionYear: Number(dayjs(video_episode.date_air).format('YYYY')),
          IndexNumber: video_episode.episode_number,
          ParentIndexNumber: video_episode_season_data.season_number,
          RemoteTrailers: [],
          ProviderIds: {},
          IsFolder: false,
          ParentId: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_SEASON, video_episode.video_season_id),
          Type: 'Episode',
          People: [],
          Studios: [],
          GenreItems: [],
          TagItems: [],
          // ParentBackdropItemId: '',
          ParentBackdropImageTags: [],
          LocalTrailerCount: 0,
          UserData: {
            // 'UnplayedItemCount'     : 0,
            PlayedPercentage: user_video_record_episode.percentage,
            PlaybackPositionTicks: user_video_record_episode.play_ms,
            PlayCount: 0,
            IsFavorite: has_favorited,
            // LastPlayedDate: '',
            Played: user_video_record_episode.is_complete,
          },
          SeriesId: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_LIST, video_episode.video_list_id),
          SeriesName: video_episode_video_title,
          SeasonId: this.EmbyService.ItemIdGenerate(EMBY_ITEM_ID_TYPE_VIDEO_SEASON, video_episode.video_season_id),
          SeasonName: video_episode_season_data.title,
          DisplayPreferencesId: '',
          PrimaryImageAspectRatio: 1.7,
          SeriesPrimaryImageTag: '',
          PartCount: 0,
          ImageTags: {
            [VideoImageTypes.TYPE_PRIMARY]: emby_item_id,
          },
          BackdropImageTags: [],
          MediaType: 'Video',
          LockedFields: [],
          LockData: true,
        }
        break

      default:
        break
    }

    return {
      ...emby_item_data,
      ServerId: this.EmbyService.Id(),
      Etag: emby_item_id,
    }
  }

  async VideoMediaFormat(video_medias: any, play_session_id = null) {
    let rows: any = []

    for (let video_media of video_medias) {
      let file_matadata: any = video_media.file_matadata || {},
        format_video = FormatVideo(typeof file_matadata == 'string' ? JSON.parse(file_matadata) : file_matadata),
        media_streams: Array<any> = format_video.streams

      let data_uuid = video_media.uuid,
        file_second = video_media.file_second

      let subtitle_default_id: any = null
      for (let subtitle of video_media.subtitles) {
        subtitle_default_id = subtitle.id
        media_streams.push({
          Codec: subtitle.codec,
          DisplayTitle: subtitle.title,
          IsInterlaced: false,
          IsDefault: false,
          IsForced: false,
          IsHearingImpaired: false,
          Type: 'Subtitle',
          Index: subtitle_default_id,
          IsExternal: true,
          DeliveryMethod: 'External',
          DeliveryUrl: `/emby/videos/${data_uuid}/subtitles/${subtitle_default_id}?api_key=${this.request.api_key}`,
          IsExternalUrl: false,
          IsTextSubtitleStream: true,
          SupportsExternalStream: true,
          Path: `/subtitles/${subtitle_default_id}`,
          Protocol: 'File',
          ExtendedVideoType: 'None',
          ExtendedVideoSubType: 'None',
          ExtendedVideoSubTypeDescription: 'None',
          AttachmentSize: 0,
        })
      }

      let rowFormat = (name: string, line: null | string = null) => {
        let play_url = play_session_id ? `/videos/${data_uuid}/original.strm?line=${line}&api_key=${this.request.api_key}` : null

        let item: any = {
          Chapters: [],
          Protocol: 'Http',
          Id: `${data_uuid}_${line}`,
          Path: `/${data_uuid}`,
          Type: 'Default',
          /**
           * 安卓 femor 1.0.66 的播放地址 如果返回的是 strm 就自己拼接 Path 了
           */
          Container: 'mkv',
          Size: video_media.file_size || 0,
          Name: name,
          IsRemote: true,
          RunTimeTicks: file_second ? file_second * 10000000 : 0,
          HasMixedProtocols: false,
          SupportsTranscoding: true,
          SupportsDirectStream: true,
          SupportsDirectPlay: true,
          IsInfiniteStream: false,
          RequiresOpening: false,
          RequiresClosing: false,
          RequiresLooping: false,
          SupportsProbing: false,
          MediaStreams: media_streams,
          Formats: [],
          Bitrate: format_video.bit_rate,
          RequiredHttpHeaders: {},
          DirectStreamUrl: play_url,
          AddApiKeyToDirectStreamUrl: true,
          ReadAtNativeFramerate: false,
          ItemId: data_uuid,
        }

        if (subtitle_default_id) {
          item.DefaultSubtitleStreamIndex = subtitle_default_id
        }

        return item
      }

      rows.push(rowFormat(video_media.name))
    }

    return rows
  }

  async VideoMedia(video_list_id: number, video_episode_id: any = null, no_media_add_default: boolean = false, play_session_id: any = null) {
    let db_where: any = [
      // prettier-ignore
      db.eq(db.schema.video_media.video_list_id, video_list_id),
      db.isNull(db.schema.video_media.deleted_at),
    ]

    if (video_episode_id) {
      db_where.push(db.eq(db.schema.video_media.video_episode_id, video_episode_id))
    }

    let video_medias = await this.model.query.video_media.findMany({
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
      where: db.and(...db_where),
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
    })

    let rows = await this.VideoMediaFormat(video_medias, play_session_id)

    if (no_media_add_default && !rows.length) {
      rows.push({
        Id: 'none',
        Name: '暂无资源',
        Path: '暂无资源',
        MediaStreams: [],
      })
    }

    return rows
  }
}
