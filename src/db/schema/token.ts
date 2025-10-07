import * as mysql from 'drizzle-orm/mysql-core'

// 账号token等
export const token = mysql.mysqlTable(
  'token',
  {
    id: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .primaryKey()
      .autoincrement(),
    token: mysql
      .varchar({
        length: 32,
      })
      .notNull(),
    user_id: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .notNull(),
    device_client: mysql.varchar({
      length: 255,
    }),
    device_name: mysql.varchar({
      length: 255,
    }),
    device_id: mysql.varchar({
      length: 255,
    }),
    device_version: mysql.varchar({
      length: 255,
    }),
    created_at: mysql.timestamp('created_at').notNull().defaultNow(),
    last_used_at: mysql.timestamp(),
  },
  (table) => [
    // prettier-ignore
    mysql.unique('uni_token').on(table.token),
    mysql.index('idx_user_id').on(table.user_id),
  ],
)
