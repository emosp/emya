import { Command, CommandRunner } from 'nest-commander'
import { Inject } from '@nestjs/common'
import { MySql2Database } from 'drizzle-orm/mysql2'
import * as db from '@/db'

import { VIDEO_TYPE_MOVIE, VIDEO_TYPE_TV } from '@/db/schema/video_list'
import { IMAGE_PATH_TYPE_TMDB } from '@/db/schema/video_image'
import { EMBY_ITEM_ID_TYPE_VIDEO_LIBRARY, EMBY_ITEM_ID_TYPE_VIDEO_LIST, EMBY_ITEM_ID_TYPE_VIDEO_SEASON, EMBY_ITEM_ID_TYPE_VIDEO_EPISODE } from '@/controller/emby/emby.service'
import { VideoMediaStatus, VideoMediaPathTypes } from '@/db/schema/video_media'
import { LibraryRoles } from '@/db/schema/library'

type VIDEO_MEDIA = {
  uuid: string
  name: string
  path_type: string
  path_url: string
}

type BASE_DATA = {
  video_library_id: number
  video_type: typeof VIDEO_TYPE_MOVIE | typeof VIDEO_TYPE_TV
  tmdb_id: string
  title: string
  cover?: string
  origin_title?: string
  description?: string
  date_air?: string
  video_seasons?: {
    season_number: number
    title: string
    cover?: string
    description?: string
    date_air?: string
    video_episodes?: {
      episode_number: number
      title: string
      cover?: string
      description?: string
      date_air?: string
      video_medias?: VIDEO_MEDIA[]
    }[]
  }[]
  video_medias?: VIDEO_MEDIA[]
}[]

const BASE_DATA: BASE_DATA = [
  {
    video_library_id: 2,
    video_type: VIDEO_TYPE_TV,
    tmdb_id: '110316',
    title: '弥留之国的爱丽丝',
    cover: '/ycBDes9DHFbfQZ3K676TTbEcfFX.jpg',
    origin_title: '今際の国のアリス',
    description: '一位漫无目标的游戏玩家和两位好友发现他们身处平行世界中的东京。为了生存下来，他们必须在一系列残忍的游戏中展开较量。',
    video_seasons: [
      {
        season_number: 2,
        title: '第二季',
        cover: '/bJpNGu7H8N794qnHi01i9eWdPl.jpg',
        description: '游戏更加致命，这个世界也愈发野蛮和残酷。有栖能否回到现实世界？他所失去的一切又是否值得？',
        date_air: '2022-12-22',
        video_episodes: [
          {
            episode_number: 1,
            title: '第一集',
            cover: '/rqxBT8eInaSZ1C0slqWgaS267uk.jpg',
            description: '有栖、宇佐木和苣屋在涉谷十字路口等待一下阶段的开始，已经等了一个多小时了，然而好像什么动静也没有。',
            date_air: '2022-12-22',
          },
          {
            episode_number: 2,
            title: '第二集',
            cover: '/6lkxDlBGRP9bABeiqomLpb7qwI.jpg',
            description: '梅花 K 耀眼现身，游戏终于开始了。令有栖颇为惊讶的是，一切进展得很顺利。',
            date_air: '2022-12-22',
          },
          {
            episode_number: 3,
            title: '第三集',
            cover: '/99APSSW63gJo7ESpUnSN29hcnB4.jpg',
            description: '游戏只剩几分钟了，每队的结果似乎都已经板上钉钉。有栖靠近久间，要求跟他握手。',
            date_air: '2022-12-22',
          },
        ],
      },
      {
        season_number: 3,
        title: '第三季',
        cover: '/3y4jpDOPm96PnUiNckwyU59yJkl.jpg',
        description: '《弥留之国的爱丽丝》第 3 季已于 2025 年 09 月 25 日 首播。',
        date_air: '2025-09-25',
        video_episodes: [
          {
            episode_number: 1,
            title: '第一集',
            cover: '/e26NEflEIWmfZFnxDy2GFDdDb5n.jpg',
            description: '回到现实世界的有栖和宇佐木失去了关于今际之国的记忆，但两人遇到了隆二 — 一个对濒死体验十分痴迷的教授。',
            date_air: '2025-09-25',
          },
          {
            episode_number: 2,
            title: '第二集',
            cover: '/3rWtc0JetCqmu56S89o64gUcF8Z.jpg',
            description: '第一局游戏在神社开始。有栖和其他玩家必须飞快解出数学题，否则就要被火海淹没。',
            date_air: '2025-09-25',
          },
          {
            episode_number: 3,
            title: '第三集',
            cover: '/hVtJnsGUp7ENIkEbQr2OMgs2DQs.jpg',
            description: '丽的计划泡汤，而有栖为了保住队友的性命不惜铤而走险。另一边，宇佐木和隆二面对的是冰冷无情的激光束。',
            date_air: '2025-09-25',
          },
        ],
      },
    ],
  },
  {
    video_library_id: 1,
    video_type: VIDEO_TYPE_MOVIE,
    tmdb_id: '238',
    title: '教父',
    cover: '/y03tzUKvkRCYwJ5NWys4W4bnS9m.jpg',
    origin_title: 'The Godfather',
    description:
      '40年代的美国，“教父”维托·唐·柯里昂是黑手党柯里昂家族的首领，带领家族从事非法的勾当，但同时他也是许多弱小平民的保护神，深得人们爱戴。因为拒绝了毒枭索洛索的毒品交易要求，柯里昂家族和纽约其他几个黑手党家族的矛盾激化、圣诞前夕，索洛索劫持了“教父”的参谋汤姆，并派人暗杀“教父”；因为内奸的出卖，“教父”的大儿子逊尼被仇家杀害；小儿子麦克也被卷了进来，失去爱妻。黑手党家族之间的矛盾越来越白热化。年老的“教父”面对丧子之痛怎样统领全局？黑手党之间的仇杀如何落幕？谁是家族的内奸？谁又能够成为新一代的“教父”？血雨腥风和温情脉脉，在这部里程碑式的黑帮史诗巨片里真实上演。',
    date_air: '1972-03-24',
  },
  {
    video_library_id: 1,
    video_type: VIDEO_TYPE_MOVIE,
    tmdb_id: '512198',
    title: '死亡新娘',
    cover: '/6JKx00vSLzKX3jSMJIhpwPU9Qzq.jpg',
    origin_title: 'Dead Bride',
    description: '一对年轻夫妇在继承一座古老的大宅时发现了黑暗的秘密。',
    date_air: '2022-10-03',
  },
]

@Command({ name: 'import-test-data', description: '导入测试数据 将会清空所有数据!!!' })
export class ImportTestData extends CommandRunner {
  constructor(@Inject('DB') private model: MySql2Database<typeof db.schema>) {
    super()
  }

  async run(passedParam: string[], options?: {}): Promise<void> {
    console.info('正在导入测试数据')

    await this.model.delete(db.schema.user)
    await this.model.delete(db.schema.token)
    await this.model.delete(db.schema.library)
    await this.model.delete(db.schema.video_list)
    await this.model.delete(db.schema.video_season)
    await this.model.delete(db.schema.video_episode)
    await this.model.delete(db.schema.video_media)
    await this.model.delete(db.schema.video_image)

    let videoImageInsert = async (relation_type: string, relation_id: number, path_url?: string) => {
      if (!path_url) {
        return
      }
      await this.model.insert(db.schema.video_image).values({
        type: 'Primary',
        relation_type,
        relation_id,
        path_type: IMAGE_PATH_TYPE_TMDB,
        path_url,
      })
    }

    let videoMediaInsert = async (video_list_id: number, name: string, video_season_id: any = null, video_episode_id: any = null) => {
      await this.model.insert(db.schema.video_media).values({
        uuid: crypto.randomUUID(),
        video_list_id,
        video_season_id,
        video_episode_id,
        name,
        status: VideoMediaStatus.STATUS_COMPLETE as any,
        path_type: VideoMediaPathTypes.PATH_TYPE_URL as any,
        path_url: 'https://www.w3schools.com/html/movie.mp4',
      })
    }

    for (let library of [
      {
        id: 1,
        name: '电影',
        role: LibraryRoles.LIBRARY_ROLE_PUBLIC,
        cover: '/nuwtlQXArDtmTWyZVHoXTqgUMwB.jpg',
      },
      {
        id: 2,
        name: '电视',
        role: LibraryRoles.LIBRARY_ROLE_PUBLIC,
        cover: '/eBhxn1g9l5UdnqfKdqMOBYltwZk.jpg',
      },
      {
        id: 3,
        name: '这是不给看的',
        role: LibraryRoles.LIBRARY_ROLE_HIDDEN,
        cover: '/zpEWFNqoN8Qg1SzMMHmaGyOBTdW.jpg',
      },
    ]) {
      await this.model.insert(db.schema.library).values({
        id: library.id,
        name: library.name,
        role: library.role,
      })

      await videoImageInsert(EMBY_ITEM_ID_TYPE_VIDEO_LIBRARY, library.id, library.cover)
    }

    for (let data of BASE_DATA) {
      let video_list_id = (
        await this.model
          .insert(db.schema.video_list)
          .values({
            video_library_id: data.video_library_id,
            video_type: data.video_type,
            tmdb_id: data.tmdb_id,
            title: data.title,
            origin_title: data.origin_title,
            description: data.description,
            // date_air: data.date_air,
          })
          .$returningId()
      )[0].id

      await videoImageInsert(EMBY_ITEM_ID_TYPE_VIDEO_LIST, video_list_id, data.cover)

      if (data.video_type == VIDEO_TYPE_TV) {
        for (let video_season of data.video_seasons || []) {
          let video_season_id = (
            await this.model
              .insert(db.schema.video_season)
              .values({
                video_list_id,
                season_number: video_season.season_number,
                title: video_season.title,
                description: video_season.description,
                // date_air: video_season.date_air,
              })
              .$returningId()
          )[0].id

          await videoImageInsert(EMBY_ITEM_ID_TYPE_VIDEO_SEASON, video_season_id, video_season.cover)

          for (let video_episode of video_season.video_episodes || []) {
            let video_episode_id = (
              await this.model
                .insert(db.schema.video_episode)
                .values({
                  video_list_id,
                  video_season_id,
                  episode_number: video_episode.episode_number,
                  title: video_episode.title,
                  description: video_episode.description,
                  // date_air: episode_number.date_air,
                })
                .$returningId()
            )[0].id

            await videoImageInsert(EMBY_ITEM_ID_TYPE_VIDEO_EPISODE, video_episode_id, video_episode.cover)

            await videoMediaInsert(video_list_id, '1080p', video_season_id, video_episode_id)
            await videoMediaInsert(video_list_id, '2160p', video_season_id, video_episode_id)
          }
        }
      } else {
        await videoMediaInsert(video_list_id, '4K')
      }
    }

    await this.model.insert(db.schema.user).values({
      id: 1,
      username: 'emya',
      folders: [1, 2],
      is_can_down: false,
      is_disable: false,
    })

    console.info('测试数据导入成功 请使用 emya 和 空密码 进行登录')

    // 测试模式好像不会自己退出
    process.exit()
  }
}
