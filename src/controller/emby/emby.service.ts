import { Injectable } from '@nestjs/common'

// 媒体库
export const EMBY_ITEM_ID_TYPE_VIDEO_LIBRARY = 'vb'
// 视频列表
export const EMBY_ITEM_ID_TYPE_VIDEO_LIST = 'vl'
// 电视季
export const EMBY_ITEM_ID_TYPE_VIDEO_SEASON = 'vs'
// 电视集
export const EMBY_ITEM_ID_TYPE_VIDEO_EPISODE = 've'

export const EMBY_DEFAULT_TIME = '0001-01-01T00:00:00.0000000Z'

@Injectable()
export class EmbyService {
  ServerName() {
    return process.env.APP_NAME
  }

  Version() {
    return process.env.EMBY_VERSION || '1.0.0'
  }

  Id() {
    return process.env.EMBY_ID || 'emya'
  }

  ItemIdGenerate(type: string, id: number) {
    return `${type}-${id}`
  }

  ItemIdParse(value: string): [string, number] | null {
    let rows = value.split('-')
    if (rows.length != 2) {
      return null
    }

    let type = rows[0]
    if (![EMBY_ITEM_ID_TYPE_VIDEO_LIBRARY, EMBY_ITEM_ID_TYPE_VIDEO_LIST, EMBY_ITEM_ID_TYPE_VIDEO_SEASON, EMBY_ITEM_ID_TYPE_VIDEO_EPISODE].includes(type)) {
      return null
    }

    let id = Number(rows[1])
    if (!id) {
      return null
    }

    return [type, id]
  }

  ItemResponse(data: [] = [], count: number | null = null) {
    return {
      Items: data,
      TotalRecordCount: count !== null ? count : data.length,
    }
  }
}
