import { IsNotEmpty, IsNotIn } from 'class-validator'

import { IsNotInCaseValidation } from '@/validation/is_not_in_case.validation'

export class Auth {
  @IsNotEmpty({
    message: '用户名不能为空',
  })
  @IsNotInCaseValidation(
    [
      // prettier-ignore
      'emos',
      'root',
      'admin',
      'system',
      'test',
      'null',
      'true',
      'false',
      'emby',
    ],
    {
      message: '不能使用这个昵称耶',
    },
  )
  username: string

  pw: string
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

export class SessionPlaying {
  volumelevel: number
  ismuted: boolean
  ispaused: boolean
  repeatmode: string
  subtitleoffset: number
  playbackrate: number
  positionticks: number
  subtitlestreamindex: number
  audiostreamindex: number
  playmethod: string
  playsessionid: string
  mediasourceid: string
  canseek: boolean
  itemid: string
  eventname: string

  // 开始和停止时存在
  nowplayingqueue: []
  maxstreamingbitrate: number
  playbackstarttimeticks: number
  playlistindex: number
  playlistlength: number
}
