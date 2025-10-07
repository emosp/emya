import { SetMetadata } from '@nestjs/common'

export const IgnoreAuth = (is_ignore = true) => SetMetadata('is_ignore', is_ignore)
