import { Module } from '@nestjs/common'

import { CacheModule } from '@/cache.module'
import { DBModule } from '@/db.module'
import { Controller } from '@/controller'

@Module({
  imports: [CacheModule, DBModule, Controller],
})
export class AppModule {}
