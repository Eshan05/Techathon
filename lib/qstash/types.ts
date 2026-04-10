export type DocumentJobState = "queued" | "processing" | "done" | "failed"

export type DocumentJobStatus = {
  state: DocumentJobState
  updatedAt: number
  message?: string
  messageId?: string
}
