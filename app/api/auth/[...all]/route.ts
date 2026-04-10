import {
  GET as sessionsGET,
  POST as sessionsPOST,
} from "@/app/api/sessions/[...all]/route"

export const runtime = "nodejs"

function rewriteToSessions(req: Request) {
  const url = new URL(req.url)
  url.pathname = url.pathname.replace(/^\/api\/auth/, "/api/sessions")
  return url
}

export async function GET(req: Request) {
  const url = rewriteToSessions(req)

  return sessionsGET(
    new Request(url, {
      method: "GET",
      headers: req.headers,
    })
  )
}

export async function POST(req: Request) {
  const url = rewriteToSessions(req)
  const body = await req.arrayBuffer()

  return sessionsPOST(
    new Request(url, {
      method: "POST",
      headers: req.headers,
      body,
    })
  )
}
