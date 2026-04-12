import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { businessSettings } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { z } from "zod";

const SINGLETON_ID = "00000000-0000-0000-0000-000000000001";

/** Always returns a settings row, auto-creating the singleton if needed. */
async function getOrCreateSettings() {
  const [existing] = await db.select().from(businessSettings).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(businessSettings)
    .values({ id: SINGLETON_ID })
    .returning();
  return created;
}

export async function GET() {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const settings = await getOrCreateSettings();
  return apiResponse(settings);
}

const updateSchema = z.object({
  shippingCostThreshold: z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid number"),
});

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  if (session.role !== "admin") return apiError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const existing = await getOrCreateSettings();
  const [updated] = await db
    .update(businessSettings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .returning();

  // If no row existed yet, insert instead (race-safe fallback)
  if (!updated) {
    const [inserted] = await db
      .insert(businessSettings)
      .values({ id: existing.id, ...parsed.data })
      .returning();
    return apiResponse(inserted);
  }

  return apiResponse(updated);
}
