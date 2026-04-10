import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

config({ path: ".env.local" })
config({ path: ".env" })

const databaseUrl = process.env.TURSO_DATABASE_URL ?? "file:./.data/auth.db"
const authToken = databaseUrl.startsWith("file:")
  ? undefined
  : process.env.TURSO_AUTH_TOKEN

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: databaseUrl,
    authToken,
  },
})
