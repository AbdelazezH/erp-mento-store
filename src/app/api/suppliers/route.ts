import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { asc, eq, ilike, sql } from "drizzle-orm";
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

  const [rows, [{ total }]] = await Promise.all([
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
        productCount: sql<number>`(
          SELECT COUNT(DISTINCT bli.product_id)::int
          FROM bill_line_items bli
          JOIN bills b ON b.id = bli.bill_id
          WHERE b.supplier_id = ${suppliers.id}
            AND bli.product_id IS NOT NULL
        )`,
        totalSpend: sql<string>`(
          SELECT COALESCE(SUM(b.total_amount::numeric), 0)::text
          FROM bills b
          WHERE b.supplier_id = ${suppliers.id}
        )`,
      })
      .from(suppliers)
      .where(whereClause)
      .orderBy(asc(suppliers.name))
      .limit(limit)
      .offset(offset),

    db.select({ total: sql<number>`COUNT(*)::int` }).from(suppliers).where(whereClause),
  ]);

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
