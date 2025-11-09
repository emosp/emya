import { Injectable, Inject, CanActivate, ExecutionContext, HttpStatus, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import * as db from '@/db'
import { MySql2Database } from 'drizzle-orm/mysql2'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject('DB') private model: MySql2Database<typeof db.schema>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let ignoreAuth = this.reflector.get<boolean>('is_ignore', context.getHandler())
    if (ignoreAuth) {
      return true
    }

    let request = context.switchToHttp().getRequest()

    let token = request.query?.['x-emby-token'] || request.headers?.['x-emby-token'] || request.query?.['api_key']

    if (!token) {
      let tokens = request.headers?.['x-emby-authorization']?.match(/Token="([^"]+)"/)
      token = tokens?.[1]
    }

    let user_id: any = null
    if (token) {
      let model = await this.model.query.token.findFirst({
          columns: {
            id: true,
            user_id: true,
          },
          where: db.eq(db.schema.token.token, token),
        }),
        token_id = model?.id

      if (token_id) {
        await this.model
          .update(db.schema.token)
          .set({
            last_used_at: db.sql`NOW()`,
          })
          .where(db.eq(db.schema.token.id, token_id))
        user_id = model?.user_id
      }
    }

    if (!user_id) {
      throw new UnauthorizedException('登录失效 请重新登录')
    }

    request['user_id'] = user_id
    request['api_key'] = token

    return true
  }
}
