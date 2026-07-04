// src/lib/db/index.ts
// Source: orm.drizzle.team/docs/get-started/neon-new
// Server-only module: never import from a client component.
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle({ client: sql, schema })
