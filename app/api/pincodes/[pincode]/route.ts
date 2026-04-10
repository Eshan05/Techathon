import { NextResponse } from "next/server"

type PostalOffice = {
  Name?: string
  District?: string
  State?: string
  Block?: string
  Taluk?: string
  Pincode?: string
}

type PostalApiResult = {
  Status?: string
  Message?: string
  PostOffice?: PostalOffice[] | PostalOffice | null
}

function normalizeResult(payload: unknown): PostalApiResult | null {
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0]
    if (first && typeof first === "object") {
      return first as PostalApiResult
    }
    return null
  }

  if (payload && typeof payload === "object") {
    return payload as PostalApiResult
  }

  return null
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ pincode: string }> }
) {
  const { pincode } = await context.params

  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json(
      { error: "Pincode must be exactly 6 digits" },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(
      `http://www.postalpincode.in/api/pincode/${pincode}`,
      {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to lookup pincode" },
        { status: 502 }
      )
    }

    const raw = (await response.json()) as unknown
    const result = normalizeResult(raw)

    if (!result) {
      return NextResponse.json(
        { error: "Unexpected pincode API response" },
        { status: 502 }
      )
    }

    const officesRaw = result.PostOffice
    const offices = Array.isArray(officesRaw)
      ? officesRaw
      : officesRaw
        ? [officesRaw]
        : []

    if (offices.length === 0 || result.Status?.toLowerCase() === "error") {
      return NextResponse.json(
        { error: result.Message || "No area found for this pincode" },
        { status: 404 }
      )
    }

    const normalized = offices.map((office) => ({
      name: office.Name ?? "",
      district: office.District ?? "",
      state: office.State ?? "",
      block: office.Block ?? office.Taluk ?? "",
      pincode: office.Pincode ?? pincode,
    }))

    return NextResponse.json({
      data: {
        pincode,
        offices: normalized,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to lookup pincode"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
