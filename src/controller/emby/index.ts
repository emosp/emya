import { Module } from '@nestjs/common'

import { WinstonModule } from 'nest-winston'
import * as winston from 'winston'
import 'winston-daily-rotate-file'

import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ExceptionFilter } from '@/controller/emby/exception.filter'
import { AuthGuard } from '@/controller/emby/auth.guard'
import { EmbyService } from '@/controller/emby/emby.service'
import { TransformService } from '@/controller/emby/transform.service'

import { BaseController } from '@/controller/emby/base.controller'
import { DisplayPreferencesController } from '@/controller/emby/displayPreferences.controller'
import { UsersController } from '@/controller/emby/users.controller'
import { SystemController } from '@/controller/emby/system.controller'
import { ItemsController } from '@/controller/emby/items.controller'
import { ShowsController } from '@/controller/emby/shows.controller'
import { SessionsController } from '@/controller/emby/sessions.controller'
import { VideosController } from '@/controller/emby/videos.controller'
import { LibraryController } from '@/controller/emby/library.controller'

@Module({
  controllers: [
    // prettier-ignore
    BaseController,
    DisplayPreferencesController,
    UsersController,
    SystemController,
    ItemsController,
    ShowsController,
    SessionsController,
    VideosController,
    LibraryController,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    EmbyService,
    TransformService,
  ],
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.DailyRotateFile({
          dirname: `@/../logs`,
          filename: 'emby_%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '10m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp({
              format: 'HH:mm:ss',
            }),
            winston.format.printf((log) => `${log.timestamp} ${log.level}: ${log.message}`),
          ),
        }),
      ],
    }),
  ],
})
export class Emby {}
