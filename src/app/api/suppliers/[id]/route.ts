import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { suppliers, bills, products, productVariants } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq, sum, count, sql, desc } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  contactName: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
  if (!supplier) return apiError("Not found", 404);

  // Stats — count distinct products from bill line items, sum bills directly
  const [stats] = await db
    .select({
      productsSourced: sql<number>`(
        SELECT COUNT(DISTINCT bli.product_id)::int
        FROM bill_line_items bli
        JOIN bills b ON b.id = bli.bill_id
        WHERE b.supplier_id = ${id}
          AND bli.product_id IS NOT NULL
      )`,
      totalInvested: sql<string>`(
        SELECT COALESCE(SUM(b.total_amount::numeric), 0)::text
        FROM bills b
        WHERE b.supplier_id = ${id}
      )`,
    })
    .from(suppliers)
    .where(eq(suppliers.id, id));

  // Bills for this supplier
  const supplierBills = await db
    .select({
      id: bills.id,
      billNumber: bills.billNumber,
      name: bills.name,
      issueDate: bills.issueDate,
      status: bills.status,
      totalAmount: bills.totalAmount,
      billType: bills.billType,
    })
    .from(bills)
    .where(eq(bills.supplierId, id))
    .orderBy(desc(bills.issueDate));

  // Products for this supplier
  const supplierProducts = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      basePrice: products.basePrice,
      sellingPrice: products.sellingPrice,
      averageCost: products.averageCost,
      stockQuantity: products.stockQuantity,
      hasVariants: products.hasVariants,
      imageUrl: products.imageUrl,
      totalStock: sql<number>`
        CASE WHEN ${products.hasVariants} = true
        THEN COALESCE((
          SELECT SUM(pv.stock_quantity)
          FROM product_variants pv
          WHERE pv.product_id = ${products.id}
        ), 0)
        ELSE ${products.stockQuantity}
        END
      `,
    })
    .from(products)
    .where(eq(products.supplierId, id));

  return apiResponse({
    ...supplier,
    productsSourced: stats?.productsSourced ?? 0,
    totalInvested: stats?.totalInvested ?? "0",
    bills: supplierBills,
    products: supplierProducts,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const [row] = await db.update(suppliers).set(parsed.data).where(eq(suppliers.id, id)).returning();
  if (!row) return apiError("Not found", 404);
  return apiResponse(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  if (session.role !== "admin") return apiError("Forbidden", 403);
  const { id } = await params;
  await db.delete(suppliers).where(eq(suppliers.id, id));
  return apiResponse({ ok: true });
}
