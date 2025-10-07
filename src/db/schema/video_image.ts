import * as mysql from 'drizzle-orm/mysql-core'
import { base } from '@/db/schema/common'

export const IMAGE_PATH_TYPE_TMDB = 'tmdb'
export const IMAGE_PATH_TYPE_DOUBAN = 'douban'
export const IMAGE_PATH_TYPE_URL = 'url'

export const VideoImagePathTypes = {
  IMAGE_PATH_TYPE_TMDB,
  IMAGE_PATH_TYPE_DOUBAN,
  IMAGE_PATH_TYPE_URL,
}

export const TYPE_LOGO = 'Logo'
export const TYPE_PRIMARY = 'Primary'
export const TYPE_BACKDROP = 'Backdrop'
export const TYPE_THUMB = 'Thumb'

export const VideoImageTypes = {
  TYPE_LOGO,
  TYPE_PRIMARY,
  TYPE_BACKDROP,
  TYPE_THUMB,
}

// 视频 图像等
export const video_image = mysql.mysqlTable(
  'video_image',
  {
    ...base,
    type: mysql
      .varchar({
        length: 255,
      })
      .notNull(),
    relation_type: mysql
      .varchar({
        length: 255,
      })
      .notNull(),
    relation_id: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .notNull(),
    path_type: mysql.varchar({
      length: 255,
    }),
    path_url: mysql.varchar({
      length: 255,
    }),
  },
  (table) => [
    // prettier-ignore
    mysql.index('idx_image').on(table.relation_type, table.relation_id),
  ],
)
