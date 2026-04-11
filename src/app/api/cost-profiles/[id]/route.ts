import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { costProfiles } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["packaging", "handling", "transaction_fee"]).optional(),
  unitCost: z.string().min(1).optional(),
  applicationRule: z.enum(["per_order", "per_item", "manual"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const [row] = await db.update(costProfiles).set(parsed.data).where(eq(costProfiles.id, id)).returning();
  if (!row) return apiError("Not found", 404);
  return apiResponse({ data: row });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  await db.delete(costProfiles).where(eq(costProfiles.id, id));
  return apiResponse({ data: { ok: true } });
}
