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

  const fastifyInstance = app.getHttpAdapter().getInstance()

  // 解决 Emby 客户端发送空 JSON body 时 Fastify 报错 FST_ERR_CTP_EMPTY_JSON_BODY 的问题
  // 采用 Fastify 原生扩展机制，跨环境跨平台无痛兼容
  fastifyInstance.removeContentTypeParser('application/json')
  fastifyInstance.addContentTypeParser('application/json', { parseAs: 'string' }, (req: any, body: any, done: any) => {
    if (!body || body.length === 0) {
      done(null, {})
      return
    }
    try {
      done(null, JSON.parse(body))
    } catch (err) {
      done(err, undefined)
    }
  })

  // 将参数统一小写
  fastifyInstance.addHook('preValidation', (req: any, reply: any, done: any) => {
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
