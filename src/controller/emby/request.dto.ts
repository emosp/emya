import { IsNotEmpty, IsNotIn } from 'class-validator'

import { IsNotInCaseValidation } from '@/validation/is_not_in_case.validation'

export class Auth {
  @IsNotEmpty({
    message: '用户名不能为空',
  })
  username: string

  pw?: string

  password?: string
}

export class UserItems {
  parentid?: string
  startindex?: number
  limit?: number
  sortorder?: string
  fields?: string
  includeitemtypes?: string
  searchterm?: string
  filters?: string
  mediatypes?: string
  sortby?: string
  genreids?: string
  namestartswith?: string
  anyprovideridequals?: string
}

export class UserItemsLatest {
  @IsNotEmpty()
  parentid: string

  @IsNotEmpty()
  limit: number
}

export class ShowEpisodes {
  seasonid: string
}

