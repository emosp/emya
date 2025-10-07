import 'dotenv/config'

import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  },
})
