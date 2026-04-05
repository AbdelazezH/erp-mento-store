import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { customers, orders } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { asc, count, sum, eq, ilike } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      address: customers.address,
      notes: customers.notes,
      createdAt: customers.createdAt,
      orderCount: count(orders.id),
      totalSpend: sum(orders.totalAmount),
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(search ? ilike(customers.name, `%${search}%`) : undefined)
    .groupBy(customers.id)
    .orderBy(asc(customers.name));

  return apiResponse(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const [row] = await db.insert(customers).values(parsed.data).returning();
  return apiResponse(row, 201);
}
