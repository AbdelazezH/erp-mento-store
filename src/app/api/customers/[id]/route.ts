import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { customers, orders } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;
  const [row] = await db.select().from(customers).where(eq(customers.id, id));
  if (!row) return apiError("Not found", 404);

  // Get order stats
  const [stats] = await db
    .select({
      orderCount: sql<number>`COUNT(*)::int`,
      totalSpend: sql<string>`COALESCE(SUM(${orders.totalAmount}), '0')`,
    })
    .from(orders)
    .where(eq(orders.customerId, id));

  return apiResponse({ ...row, orderCount: stats.orderCount, totalSpend: stats.totalSpend });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const [row] = await db.update(customers).set(parsed.data).where(eq(customers.id, id)).returning();
  if (!row) return apiError("Not found", 404);
  return apiResponse(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  if (session.role !== "admin") return apiError("Forbidden", 403);
  const { id } = await params;
  await db.delete(customers).where(eq(customers.id, id));
  return apiResponse({ ok: true });
}
