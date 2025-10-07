import { bigint, timestamp } from 'drizzle-orm/mysql-core'

export const base = {
  id: bigint({
    mode: 'number',
    unsigned: true,
  })
    .primaryKey()
    .autoincrement(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  deleted_at: timestamp('deleted_at'),
}
