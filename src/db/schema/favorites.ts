import * as mysql from 'drizzle-orm/mysql-core'

// 收藏
export const favorites = mysql.mysqlTable(
  'favorites',
  {
    id: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .primaryKey()
      .autoincrement(),
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
    user_id: mysql
      .bigint({
        mode: 'number',
        unsigned: true,
      })
      .notNull(),
    created_at: mysql.timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    // prettier-ignore
    mysql.unique('unx_favorites').on(table.relation_type, table.relation_id, table.user_id),
  ],
)
