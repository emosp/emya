import * as mysql from 'drizzle-orm/mysql-core'
import { base } from '@/db/schema/common'

// 视频 电视 集
export const video_episode = mysql.mysqlTable(
  'video_episode',
  {
    ...base,
    video_list_id: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .notNull(),
    video_season_id: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .notNull(),
    episode_number: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .notNull(),
    title: mysql
      .varchar({
        length: 255,
      })
      .notNull(),
    description: mysql.text(),
    date_air: mysql.date(),
    runtime: mysql.smallint({
      unsigned: true,
    }),
  },
  (table) => [
    // prettier-ignore
    mysql.unique('unx_episode').on(table.video_list_id, table.video_season_id, table.episode_number),
    mysql.index('idx_video_season_id').on(table.video_season_id),
    mysql.index('idx_date_air').on(table.date_air),
  ],
)
