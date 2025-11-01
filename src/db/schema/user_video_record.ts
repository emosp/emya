import * as mysql from 'drizzle-orm/mysql-core'

// 用户播放进度等
export const user_video_record = mysql.mysqlTable(
  'user_video_record',
  {
    id: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .primaryKey()
      .autoincrement(),
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
    play_seconds: mysql.bigint({
      mode: 'number',
      unsigned: true,
    }),
    is_complete: mysql.boolean(),
    user_id: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .notNull(),
    updated_at: mysql.timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    // prettier-ignore
    mysql.index('idx_list_id').on(table.video_list_id),
    mysql.index('idx_episode_id').on(table.video_episode_id),
    mysql.index('idx_user_id').on(table.user_id),
  ],
)
