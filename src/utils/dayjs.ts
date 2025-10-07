import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.locale('zh-cn')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Shanghai')

export const getTimestamp = () => dayjs().unix()

export const getFormatDate = (template = 'YYYY-MM-DD HH:mm:ss') => dayjs().tz().format(template)

export const formatTimeToEmby = (time: any = null) => dayjs(time || undefined).format('YYYY-MM-DDTHH:mm:ss') + '.0000000Z'

export { dayjs }
