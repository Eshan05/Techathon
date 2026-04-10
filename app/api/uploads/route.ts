import { createRouteHandler } from "uploadthing/next"

import { uploadRouter } from "@/lib/uploads/router"

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
})
