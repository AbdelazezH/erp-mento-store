import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;
  const [row] = await db.select().from(categories).where(eq(categories.id, id));
  if (!row) return apiError("Not found", 404);
  return apiResponse(row);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const [row] = await db.update(categories).set(parsed.data).where(eq(categories.id, id)).returning();
  if (!row) return apiError("Not found", 404);
  return apiResponse(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  if (session.role !== "admin") return apiError("Forbidden", 403);
  const { id } = await params;
  await db.delete(categories).where(eq(categories.id, id));
  return apiResponse({ ok: true });
}
