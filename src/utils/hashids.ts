import Hashids from 'hashids'

const hashids = new Hashids(process.env.APP_NAME, 16)

export const encode = (user_id: number) => hashids.encode(user_id)
export const decode = (value: string) => hashids.decode(value)?.[0]
