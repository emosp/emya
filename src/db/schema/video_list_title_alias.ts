import * as mysql from 'drizzle-orm/mysql-core'
import { base } from '@/db/schema/common'

// 视频列表标题别名
export const video_list_title_alias = mysql.mysqlTable(
  'video_list_title_alias',
  {
    ...base,
    video_list_id: mysql
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
    user_id: mysql.bigint({
      mode: 'number',
      unsigned: true,
    }),
  },
  (table) => [
    // prettier-ignore
    mysql.index('idx_video_list_id').on(table.video_list_id),
    mysql.index('idx_title').on(table.title),
    mysql.index('idx_deleted_at').on(table.deleted_at),
  ],
)
