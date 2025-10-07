import * as mysql from 'drizzle-orm/mysql-core'
import { base } from '@/db/schema/common'

export const VIDEO_TYPE_TV = 'tv'
export const VIDEO_TYPE_MOVIE = 'movie'

export const VideoTypes = {
  VIDEO_TYPE_TV,
  VIDEO_TYPE_MOVIE,
}

// 视频列表
export const video_list = mysql.mysqlTable(
  'video_list',
  {
    ...base,
    video_library_id: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .notNull(),
    video_type: mysql
      .varchar({
        length: 255,
        enum: [VIDEO_TYPE_TV, VIDEO_TYPE_MOVIE],
      })
      .notNull(),
    tmdb_id: mysql.varchar({
      length: 255,
    }),
    title: mysql
      .varchar({
        length: 255,
      })
      .notNull(),
    origin_title: mysql.varchar({
      length: 255,
    }),
    description: mysql.text(),
    tagline: mysql.text(),
    genres: mysql.json(),
    peoples: mysql.json(),
    upcoming: mysql.varchar({
      length: 255,
    }),
    date_air: mysql.date(),
    runtime: mysql.smallint({
      unsigned: true,
    }),
    remark: mysql.varchar({
      length: 255,
    }),
  },
  (table) => [
    // prettier-ignore
    mysql.unique('unx_list').on(table.video_type, table.tmdb_id),
    mysql.index('idx_title').on(table.title),
    mysql.index('idx_origin_title').on(table.origin_title),
  ],
)
