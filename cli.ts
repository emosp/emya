import 'dotenv/config'

import { CommandFactory } from 'nest-commander'
import { CliModule } from './commands/module'

;(async () => {
  await CommandFactory.run(CliModule)
})()
