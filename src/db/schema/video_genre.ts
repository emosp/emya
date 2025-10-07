import * as mysql from 'drizzle-orm/mysql-core'
import { base } from '@/db/schema/common'

// 视频 分类 类型等
export const video_genre = mysql.mysqlTable(
  'video_genre',
  {
    ...base,
    tmdb_id: mysql
      .varchar({
        length: 255,
      })
      .notNull(),
    name: mysql
      .varchar({
        length: 255,
      })
      .notNull(),
  },
  (table) => [
    // prettier-ignore
    mysql.unique('unx_genre').on(table.tmdb_id),
  ],
)
