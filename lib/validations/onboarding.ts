import { z } from "zod"

export const SUPPORTED_IDENTITY_DOCS = [
  "aadhaar",
  "pan",
  "driving_license",
  "voter_id",
] as const

export const IDENTITY_DOC_LABELS = {
  aadhaar: "Aadhaar",
  pan: "PAN Card",
  driving_license: "Driving License",
  voter_id: "Voter ID",
}

export const identityUploadSchema = z.object({
  documentType: z.enum(SUPPORTED_IDENTITY_DOCS),
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, "File size must be under 10MB")
    .refine(
      (file) => ["image/jpeg", "image/png", "application/pdf"].includes(file.type),
      "Only JPEG, PNG, or PDF files are allowed"
    ),
})

export const landVerificationSchema = z.object({
  file: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || file.size <= 10 * 1024 * 1024,
      "File size must be under 10MB"
    )
    .refine(
      (file) =>
        !file ||
        ["image/jpeg", "image/png", "application/pdf"].includes(file.type),
      "Only JPEG, PNG, or PDF files are allowed"
    ),
})

export const faceVerificationSchema = z.object({
  faceData: z.string().min(100, "Invalid face scan data"),
})

export type IdentityUploadInput = z.infer<typeof identityUploadSchema>
export type LandVerificationInput = z.infer<typeof landVerificationSchema>
export type FaceVerificationInput = z.infer<typeof faceVerificationSchema>
