import { Module } from '@nestjs/common'
import { schema } from '@/db'
import { DrizzleMySqlModule } from '@knaadh/nestjs-drizzle-mysql2'
import * as process from 'node:process'

@Module({
  imports: [
    DrizzleMySqlModule.registerAsync({
      tag: 'DB',
      useFactory() {
        return {
          mysql: {
            connection: process.env?.DB_CONNECTION || 'pool',
            config: {
              host: process.env.DB_HOST,
              port: process.env.DB_PORT,
              database: process.env.DB_DATABASE,
              user: process.env.DB_USERNAME,
              password: process.env.DB_PASSWORD,
              socketPath: process.env.DB_SOCKET_PATH,
              connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 20,
            },
          } as any,
          config: { schema, mode: 'planetscale' },
        }
      },
    }),
  ],
})
export class DBModule {}
