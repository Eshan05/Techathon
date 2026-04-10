import { drizzle } from "drizzle-orm/libsql"
import fs from "node:fs"

import * as schema from "@/lib/db/schema"
import { tursoAuthToken, tursoDatabaseUrl } from "@/utils/constants"

if (tursoDatabaseUrl.startsWith("file:")) {
  fs.mkdirSync(".data", { recursive: true })
}

export const db = drizzle({
  connection: {
    url: tursoDatabaseUrl,
    authToken: tursoAuthToken,
  },
  schema,
})
