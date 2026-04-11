import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { customers, orders } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { asc, count, sum, eq, ilike, sql, or } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  phone2: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

  const whereClause = search
    ? or(
        ilike(customers.name, `%${search}%`),
        ilike(customers.phone, `%${search}%`),
        ilike(customers.phone2, `%${search}%`),
      )
    : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        phone2: customers.phone2,
        governorate: customers.governorate,
        address: customers.address,
        notes: customers.notes,
        createdAt: customers.createdAt,
        orderCount: count(orders.id),
        totalSpend: sum(orders.totalAmount),
      })
      .from(customers)
      .leftJoin(orders, eq(orders.customerId, customers.id))
      .where(whereClause)
      .groupBy(customers.id)
      .orderBy(asc(customers.name))
      .limit(limit)
      .offset(offset),

    db.select({ total: sql<number>`COUNT(*)::int` }).from(customers).where(whereClause),
  ]);

  return apiResponse({ data: rows, total });
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
