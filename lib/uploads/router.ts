import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const uploadRouter = {
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
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
