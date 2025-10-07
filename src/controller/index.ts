import { Module } from '@nestjs/common'

import { Emby } from './emby'

@Module({
  imports: [Emby],
})
export class Controller {}
