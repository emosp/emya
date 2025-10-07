import * as mysql from 'drizzle-orm/mysql-core'
import { base } from '@/db/schema/common'

const STATUS_DEFAULT = 'default'
const STATUS_REVIEW = 'review'
const STATUS_REFUSE = 'refuse'
const STATUS_COMPLETE = 'complete'

export const VideoMediaStatus = {
    STATUS_DEFAULT,
    STATUS_REVIEW,
    STATUS_REFUSE,
    STATUS_COMPLETE,
}

const PATH_TYPE_LOCAL = 'local'
const PATH_TYPE_URL = 'url'

export const VideoMediaPathTypes = {
    PATH_TYPE_LOCAL,
    PATH_TYPE_URL,
}

// 视频媒体
export const video_media = mysql.mysqlTable(
  'video_media',
  {
    ...base,
    uuid: mysql
      .char({
        length: 36,
      })
      .unique()
      .$defaultFn(() => crypto.randomUUID()),
    video_list_id: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .notNull(),
    video_season_id: mysql.bigint({
      mode: 'number',
      unsigned: true,
    }),
    video_episode_id: mysql.bigint({
      mode: 'number',
      unsigned: true,
    }),
    name: mysql
      .varchar({
        length: 255,
      })
      .notNull(),
    status: mysql
      .varchar({
        length: 255,
        enum: [STATUS_DEFAULT, STATUS_REVIEW, STATUS_REFUSE, STATUS_COMPLETE],
      })
      .notNull(),
    file_size: mysql.bigint({
      mode: 'number',
      unsigned: true,
    }),
    file_second: mysql.bigint({
      mode: 'number',
      unsigned: true,
    }),
    // 元信息
    file_streams: mysql.json(),
    // 视频容器 mkv mp4 等 暂未用到
    file_container: mysql.varchar({
      length: 255,
    }),
    // 章节
    file_chapters: mysql.json(),
    path_type: mysql.varchar({
      length: 255,
    }),
    path_url: mysql.varchar({
      length: 255,
    }),
    user_id: mysql.bigint({
      mode: 'number',
      unsigned: true,
    }),
    number_view: mysql.bigint({
      mode: 'number',
      unsigned: true,
    }),
  },
  (table) => [
    // prettier-ignore
    mysql.index('idx_media').on(table.video_list_id, table.video_season_id, table.video_episode_id),
  ],
)
