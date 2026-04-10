import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { suppliers, bills, billLineItems } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { asc, eq, ilike, sql, inArray, isNotNull, and } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

  const whereClause = search ? ilike(suppliers.name, `%${search}%`) : undefined;

  // Step 1: get paginated supplier rows + total count
  const [supplierRows, [{ total }]] = await Promise.all([
    db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        contactName: suppliers.contactName,
        email: suppliers.email,
        phone: suppliers.phone,
        address: suppliers.address,
        notes: suppliers.notes,
        createdAt: suppliers.createdAt,
      })
      .from(suppliers)
      .where(whereClause)
      .orderBy(asc(suppliers.name))
      .limit(limit)
      .offset(offset),

    db.select({ total: sql<number>`COUNT(*)::int` }).from(suppliers).where(whereClause),
  ]);

  if (supplierRows.length === 0) return apiResponse({ data: [], total });

  const ids = supplierRows.map((s) => s.id);

  // Step 2: get bill totals and product counts per supplier in parallel
  const [spendRows, countRows] = await Promise.all([
    db
      .select({
        supplierId: bills.supplierId,
        totalSpend: sql<string>`COALESCE(SUM(${bills.totalAmount}::numeric), 0)::text`,
      })
      .from(bills)
      .where(and(isNotNull(bills.supplierId), inArray(bills.supplierId, ids)))
      .groupBy(bills.supplierId),

    db
      .select({
        supplierId: bills.supplierId,
        productCount: sql<number>`COUNT(DISTINCT ${billLineItems.productId})::int`,
      })
      .from(bills)
      .innerJoin(
        billLineItems,
        and(eq(billLineItems.billId, bills.id), isNotNull(billLineItems.productId))
      )
      .where(and(isNotNull(bills.supplierId), inArray(bills.supplierId, ids)))
      .groupBy(bills.supplierId),
  ]);

  // Step 3: merge stats into supplier rows
  const spendMap = new Map(spendRows.map((r) => [r.supplierId, r.totalSpend]));
  const countMap = new Map(countRows.map((r) => [r.supplierId, r.productCount]));

  const rows = supplierRows.map((s) => ({
    ...s,
    totalSpend: spendMap.get(s.id) ?? "0",
    productCount: countMap.get(s.id) ?? 0,
  }));

  return apiResponse({ data: rows, total });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const [row] = await db.insert(suppliers).values(parsed.data).returning();
  return apiResponse(row, 201);
}
