import { Module } from '@nestjs/common'

import { DBModule } from '@/db.module'
import { Controller } from '@/controller'

@Module({
  imports: [DBModule, Controller],
})
export class AppModule {}
