import * as mysql from 'drizzle-orm/mysql-core'
import { base } from '@/db/schema/common'

// 视频演员
export const video_people = mysql.mysqlTable(
  'video_people',
  {
    ...base,
    tmdb_id: mysql
      .varchar({
        length: 255,
      })
      .notNull(),
    type: mysql
      .varchar({
        length: 255,
      })
      .notNull(),
    name: mysql
      .varchar({
        length: 255,
      })
      .notNull(),
    original_name: mysql.varchar({
      length: 255,
    }),
    gender: mysql
      .tinyint({
        unsigned: true,
      })
      .notNull(),
    description: mysql.text(),
    birthday: mysql.date(),
    deathday: mysql.date(),
  },
  (table) => [
    // prettier-ignore
    mysql.unique('unx_people').on(table.tmdb_id),
  ],
)
