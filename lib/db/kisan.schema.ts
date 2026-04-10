import { relations, sql } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import { users } from "@/lib/db/auth.schema"

export const farmerProfiles = sqliteTable(
  "farmer_profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),

    fullName: text("full_name"),
    phone: text("phone"),
    preferredLanguage: text("preferred_language").default("hi").notNull(),
    supportNeed: text("support_need"),
    trustedHelperName: text("trusted_helper_name"),
    trustedHelperPhone: text("trusted_helper_phone"),

    state: text("state"),
    district: text("district"),
    tehsil: text("tehsil"),
    village: text("village"),

    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("farmer_profiles_userId_idx").on(table.userId)]
)

export const landParcels = sqliteTable(
  "land_parcels",
  {
    id: text("id").primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    nickname: text("nickname"),

    state: text("state"),
    district: text("district"),
    tehsil: text("tehsil"),
    village: text("village"),

    khataNo: text("khata_no"),
    khasraNo: text("khasra_no"),
    mutationNo: text("mutation_no"),

    ownerName: text("owner_name"),
    ownershipShare: text("ownership_share"),

    notes: text("notes"),

    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("land_parcels_userId_idx").on(table.userId)]
)

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    kind: text("kind").notNull(),

    uploadthingKey: text("uploadthing_key"),
    url: text("url"),

    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    sha256: text("sha256"),

    landParcelId: text("land_parcel_id").references(() => landParcels.id, {
      onDelete: "set null",
    }),

    issuedAt: integer("issued_at", { mode: "timestamp_ms" }),

    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("documents_userId_idx").on(table.userId),
    index("documents_landParcelId_idx").on(table.landParcelId),
  ]
)

export const farmerProfilesRelations = relations(farmerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [farmerProfiles.userId],
    references: [users.id],
  }),
}))

export const landParcelsRelations = relations(landParcels, ({ one, many }) => ({
  user: one(users, {
    fields: [landParcels.userId],
    references: [users.id],
  }),
  documents: many(documents),
}))

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  landParcel: one(landParcels, {
    fields: [documents.landParcelId],
    references: [landParcels.id],
  }),
}))
