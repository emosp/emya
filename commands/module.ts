import { Module } from '@nestjs/common'

import { DBModule } from '@/db.module'
import { ImportTestData } from './ImportTestData'

@Module({
  imports: [DBModule],
  providers: [ImportTestData],
})
export class CliModule {}
