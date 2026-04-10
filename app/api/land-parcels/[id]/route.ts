import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { landParcels } from "@/lib/db/schema";

export const runtime = "nodejs";

const landParcelPatchSchema = z
  .object({
    nickname: z.string().trim().min(1).max(120).nullable().optional(),

    state: z.string().trim().min(1).max(120).nullable().optional(),
    district: z.string().trim().min(1).max(120).nullable().optional(),
    tehsil: z.string().trim().min(1).max(120).nullable().optional(),
    village: z.string().trim().min(1).max(120).nullable().optional(),

    khataNo: z.string().trim().min(1).max(64).nullable().optional(),
    khasraNo: z.string().trim().min(1).max(64).nullable().optional(),
    mutationNo: z.string().trim().min(1).max(64).nullable().optional(),

    ownerName: z.string().trim().min(1).max(120).nullable().optional(),
    ownershipShare: z.string().trim().min(1).max(64).nullable().optional(),

    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const row = await db.query.landParcels.findFirst({
    where: and(eq(landParcels.id, id), eq(landParcels.userId, session.user.id)),
  });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: row });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = landParcelPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await db.query.landParcels.findFirst({
    where: and(eq(landParcels.id, id), eq(landParcels.userId, session.user.id)),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const next = {
    nickname:
      parsed.data.nickname === undefined ? existing.nickname : parsed.data.nickname,

    state: parsed.data.state === undefined ? existing.state : parsed.data.state,
    district:
      parsed.data.district === undefined ? existing.district : parsed.data.district,
    tehsil: parsed.data.tehsil === undefined ? existing.tehsil : parsed.data.tehsil,
    village:
      parsed.data.village === undefined ? existing.village : parsed.data.village,

    khataNo:
      parsed.data.khataNo === undefined ? existing.khataNo : parsed.data.khataNo,
    khasraNo:
      parsed.data.khasraNo === undefined ? existing.khasraNo : parsed.data.khasraNo,
    mutationNo:
      parsed.data.mutationNo === undefined
        ? existing.mutationNo
        : parsed.data.mutationNo,

    ownerName:
      parsed.data.ownerName === undefined
        ? existing.ownerName
        : parsed.data.ownerName,
    ownershipShare:
      parsed.data.ownershipShare === undefined
        ? existing.ownershipShare
        : parsed.data.ownershipShare,

    notes: parsed.data.notes === undefined ? existing.notes : parsed.data.notes,

    updatedAt: new Date(),
  };

  await db
    .update(landParcels)
    .set(next)
    .where(and(eq(landParcels.id, id), eq(landParcels.userId, session.user.id)));

  const row = await db.query.landParcels.findFirst({
    where: and(eq(landParcels.id, id), eq(landParcels.userId, session.user.id)),
  });

  return NextResponse.json({ data: row });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const row = await db.query.landParcels.findFirst({
    where: and(eq(landParcels.id, id), eq(landParcels.userId, session.user.id)),
  });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(landParcels)
    .where(and(eq(landParcels.id, id), eq(landParcels.userId, session.user.id)));

  return NextResponse.json({ data: { id } });
}
