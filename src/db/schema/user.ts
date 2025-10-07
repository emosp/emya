import * as mysql from 'drizzle-orm/mysql-core'
import { base } from '@/db/schema/common'

// 用户信息
export const user = mysql.mysqlTable(
  'user',
  {
    ...base,
    username: mysql.varchar({
      length: 255,
    }),
    password: mysql.varchar({
      length: 255,
    }),
    // 可访问的媒体库
    folders: mysql.json(),
    // 是否可以下载
    is_can_down: mysql.boolean(),
    // 是否禁用
    is_disable: mysql.boolean(),
    remark: mysql.varchar({
      length: 255,
    }),
  },
  (table) => [
    // prettier-ignore
    mysql.unique('unx_user').on(table.username),
  ],
)
