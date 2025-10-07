import 'dotenv/config'

import { NestFactory } from '@nestjs/core'
import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from '@/module'

;(async () => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      caseSensitive: false,
      logger: process.env.APP_LOG === 'true',
    }),
  )

  // 将参数统一小写
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('preValidation', (req, reply, done) => {
      if (req.query) {
        req.query = Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k.toLowerCase(), v]))
      }

      if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        req.body = Object.fromEntries(Object.entries(req.body).map(([k, v]) => [k.toLowerCase(), v]))
      }

      done()
    })

  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) => {
        let message = Object.values(errors[0].constraints || [])[0]
        throw new UnprocessableEntityException(message)
      },
    }),
  )

  await app.listen(process.env.SERVER_PORT, process.env.SERVER_HOST)

  console.log(`emya running on: ${await app.getUrl()}`)
})()
