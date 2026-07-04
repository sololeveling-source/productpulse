// drizzle.config.ts (project root)
// Source: orm.drizzle.team/docs/get-started/neon-new + neon.com/docs/connect/choose-connection
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    // Direct (unpooled) connection — required for schema tooling
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
})
