import { z } from "zod"
import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError } from "uploadthing/server"

import { auth } from "@/lib/auth/auth"
import { db } from "@/lib/db/db"
import { documents } from "@/lib/db/schema"
import { siteConfig } from "@/lib/site"
import { getQstashClient } from "@/lib/qstash/client"
import { setDocumentJobStatus } from "@/lib/qstash/document-jobs"

const f = createUploadthing()

const vaultDocumentInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    kind: z.string().trim().min(1).max(50),
    landParcelId: z.string().trim().min(1).max(64).nullable().optional(),
    issuedAt: z.number().int().nonnegative().nullable().optional(),
  })
  .strict()

export const uploadRouter = {
  // Keep this permissive: used during sign-up when a server session may not exist yet.
  avatarImage: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "2MB",
    },
  })
    .middleware(async () => ({ uploadedAt: Date.now() }))
    .onUploadComplete(async ({ file, metadata }) => ({
      key: file.key,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: metadata.uploadedAt,
      url: file.ufsUrl,
    })),

  vaultDocument: f({
    image: { maxFileCount: 1, maxFileSize: "8MB" },
    pdf: { maxFileCount: 1, maxFileSize: "16MB" },
    text: { maxFileCount: 1, maxFileSize: "512KB" },
  })
    .input(vaultDocumentInput)
    .middleware(async ({ req, input }) => {
      const session = await auth.api.getSession({ headers: req.headers })
      if (!session?.session) {
        throw new UploadThingError("Unauthorized")
      }

      return {
        userId: session.user.id,
        uploadedAt: Date.now(),
        docInput: input,
      }
    })
    .onUploadComplete(async ({ file, metadata }) => {
      const id = crypto.randomUUID()

      await db.insert(documents).values({
        id,
        userId: metadata.userId,
        title: metadata.docInput.title,
        kind: metadata.docInput.kind,
        uploadthingKey: file.key,
        url: file.ufsUrl,
        mimeType: file.type,
        sizeBytes: file.size,
        sha256: null,
        landParcelId: metadata.docInput.landParcelId ?? null,
        issuedAt:
          metadata.docInput.issuedAt === undefined ||
          metadata.docInput.issuedAt === null
            ? null
            : new Date(metadata.docInput.issuedAt),
      })

      const row = await db.query.documents.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.id, id), eq(t.userId, metadata.userId)),
      })

      // Queue a background "trust indexing" job (sha256) via QStash if configured.
      // QStash adds delivery retries automatically.
      const qstash = getQstashClient()
      let job: {
        state: "queued" | "failed"
        updatedAt: number
        message?: string
        messageId?: string
      } | null = null

      if (qstash) {
        try {
          job = { state: "queued", updatedAt: Date.now() }
          await setDocumentJobStatus(metadata.userId, id, job)

          const res = await qstash.publishJSON({
            url: `${siteConfig.url}/api/qstash/documents/process`,
            body: { userId: metadata.userId, documentId: id },
          })

          job = {
            state: "queued",
            updatedAt: Date.now(),
            messageId: res.messageId,
          }
          await setDocumentJobStatus(metadata.userId, id, job)
        } catch (e) {
          console.error(e)
          job = {
            state: "failed",
            updatedAt: Date.now(),
            message: "Queue unavailable",
          }
          await setDocumentJobStatus(metadata.userId, id, job)
        }
      }

      const document = !row
        ? null
        : {
            ...row,
            createdAt: row.createdAt.toISOString(),
            issuedAt: row.issuedAt ? row.issuedAt.toISOString() : null,
            ocrExtractedAt: row.ocrExtractedAt
              ? row.ocrExtractedAt.toISOString()
              : null,
            job,
          }

      return {
        document,
        upload: {
          key: file.key,
          name: file.name,
          size: file.size,
          type: file.type,
          url: file.ufsUrl,
        },
      }
    }),

  analyzerDocument: f({
    image: { maxFileCount: 1, maxFileSize: "8MB" },
    pdf: { maxFileCount: 1, maxFileSize: "16MB" },
    text: { maxFileCount: 1, maxFileSize: "512KB" },
  })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({ headers: req.headers })
      if (!session?.session) {
        throw new UploadThingError("Unauthorized")
      }

      return {
        userId: session.user.id,
        uploadedAt: Date.now(),
      }
    })
    .onUploadComplete(async ({ file, metadata }) => ({
      key: file.key,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: metadata.uploadedAt,
      url: file.ufsUrl,
    })),
} satisfies FileRouter

export type UploadRouter = typeof uploadRouter
