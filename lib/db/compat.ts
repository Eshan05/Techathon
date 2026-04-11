import { sql } from "drizzle-orm"

import { db } from "@/lib/db/db"

type TableInfoRow = {
  name: string
}

let farmerProfilesSchemaReady: Promise<void> | null = null

async function ensureFarmerProfilesSupportNeedColumn() {
  const columns = (await db.all(
    sql.raw("PRAGMA table_info(farmer_profiles)")
  )) as TableInfoRow[]

  if (columns.some((column) => column.name === "support_need")) {
    return
  }

  await db.run(
    sql.raw("ALTER TABLE farmer_profiles ADD COLUMN support_need text")
  )
}

export function ensureFarmerProfilesSchema() {
  if (!farmerProfilesSchemaReady) {
    farmerProfilesSchemaReady = ensureFarmerProfilesSupportNeedColumn().catch(
      (error) => {
        farmerProfilesSchemaReady = null
        throw error
      }
    )
  }

  return farmerProfilesSchemaReady
}
