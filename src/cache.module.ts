import { Module } from '@nestjs/common'
import { CacheModule as CM } from '@nestjs/cache-manager'
import KeyvValkey from '@keyv/valkey'

@Module({
  imports: [
    CM.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        let stores: any = []

        if (process.env.VALKEY_HOST) {
          stores.push(
            new KeyvValkey(`redis://${process.env.VALKEY_USERNAME || ''}:${process.env.VALKEY_PASSWORD}@${process.env.VALKEY_HOST}:${process.env.VALKEY_PORT}`, {
              useRedisSets: true,
              keyPrefix: `emya_${process.env.APP_NAME}`,
            }),
          )
        }

        return {
          stores,
        }
      },
    }),
  ],
})
export class CacheModule {}
