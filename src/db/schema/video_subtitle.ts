import * as mysql from 'drizzle-orm/mysql-core'
import { base } from '@/db/schema/common'

// 视频 字幕
export const video_subtitle = mysql.mysqlTable(
  'video_subtitle',
  {
    ...base,
    video_media_id: mysql
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
    path_type: mysql.varchar({
      length: 255,
    }),
    path_url: mysql.varchar({
      length: 255,
    }),
  },
  (table) => [
    // prettier-ignore
    mysql.index('idx_video_media_id').on(table.video_media_id),
  ],
)
