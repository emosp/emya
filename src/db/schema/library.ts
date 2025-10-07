import * as mysql from 'drizzle-orm/mysql-core'
import { base } from '@/db/schema/common'

const LIBRARY_ROLE_PUBLIC = 'public'
const LIBRARY_ROLE_HIDDEN = 'hidden'

export const LibraryRoles = {
  LIBRARY_ROLE_PUBLIC,
  LIBRARY_ROLE_HIDDEN,
}

// 媒体库
export const library = mysql.mysqlTable(
  'library',
  {
    ...base,
    name: mysql.varchar({
      length: 255,
    }),
    // 媒体库角色 隐藏 公开 这种
    role: mysql.varchar({
      length: 255,
    }),
  },
  (table) => [
    // prettier-ignore
    mysql.index('idx_name').on(table.name),
  ],
)
