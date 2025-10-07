import * as mysql from 'drizzle-orm/mysql-core'
import { base } from '@/db/schema/common'

// 视频 电视 季
export const video_season = mysql.mysqlTable(
  'video_season',
  {
    ...base,
    video_list_id: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .notNull(),
    season_number: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .notNull(),
    // 自定义季数
    season_number_custom: mysql.bigint({
      mode: 'number',
      unsigned: true,
    }),
    title: mysql
      .varchar({
        length: 255,
      })
      .notNull(),
    description: mysql.text(),
    date_air: mysql.date(),
  },
  (table) => [
    // prettier-ignore
    mysql.unique('unx_season').on(table.video_list_id, table.season_number),
  ],
)
