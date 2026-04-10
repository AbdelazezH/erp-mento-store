import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, billLineItems, billPayers, suppliers, products } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse, generateBillNumber } from "@/lib/utils";
import { desc, asc, eq, ilike, and, gte, lte, sum, sql, count as drizzleCount, or } from "drizzle-orm";
import { z } from "zod";

const lineItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  variantId: z.string().uuid().optional().nullable(),
  description: z.string().min(1),
  quantity: z.string().default("1"),
  unitPrice: z.string(),
  discountPercent: z.string().default("0"),
  discountType: z.enum(["percent", "fixed"]).default("percent"),
  total: z.string(),
});

async function updateProductAverageCosts(productIds: string[]) {
  const unique = [...new Set(productIds.filter(Boolean))];
  for (const productId of unique) {
    const [result] = await db
      .select({
        weightedSum: sum(sql`${billLineItems.quantity}::numeric * ${billLineItems.unitPrice}::numeric`),
        totalQty: sum(sql`${billLineItems.quantity}::numeric`),
      })
      .from(billLineItems)
      .where(eq(billLineItems.productId, productId));

    const weightedSum = parseFloat(result?.weightedSum ?? "0");
    const totalQty = parseFloat(result?.totalQty ?? "0");
    if (totalQty > 0) {
      const avgCost = (weightedSum / totalQty).toFixed(2);
      await db.update(products).set({ averageCost: avgCost }).where(eq(products.id, productId));
    }
  }
}

const payerSchema = z.object({
  personName: z.string().min(1),
  amount: z.string(),
});

const createSchema = z.object({
  name: z.string().min(1),
  supplierId: z.string().uuid().optional().nullable(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(["pending", "overdue", "paid", "cancelled"]).default("pending"),
  billType: z.enum(["supplier_bill", "other_expense", "operation_invoice", "packaging_invoice", "shipping_invoice", "devices_invoice", "website_invoice", "advertising_bill"]).default("supplier_bill"),
  paidBy: z.string().optional().nullable(),
  receiptImageUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).default([]),
  payers: z.array(payerSchema).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status");
  const billType = searchParams.get("billType");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const payer = searchParams.get("payer");
  const sortDir = searchParams.get("sortDir") ?? "desc";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

  // Base conditions (shared between data query and count query, excluding billType)
  const baseConditions: ReturnType<typeof eq>[] = [];
  if (search) baseConditions.push(ilike(bills.name, `%${search}%`));
  if (status) baseConditions.push(eq(bills.status, status as "pending" | "overdue" | "paid" | "cancelled"));
  if (dateFrom) baseConditions.push(gte(bills.issueDate, dateFrom));
  if (dateTo) baseConditions.push(lte(bills.issueDate, dateTo));
  if (payer) {
    baseConditions.push(
      or(
        eq(bills.paidBy, payer),
        sql`EXISTS (SELECT 1 FROM bill_payers WHERE bill_id = ${bills.id} AND person_name = ${payer})`
      )! as any
    );
  }

  // Data conditions (includes billType)
  const dataConditions = [...baseConditions];
  if (billType) dataConditions.push(eq(bills.billType, billType as any));

  const whereClause = dataConditions.length > 0 ? and(...dataConditions) : undefined;
  const orderClause = sortDir === "asc" ? asc(bills.issueDate) : desc(bills.issueDate);

  // Run data query + type counts query in parallel
  const [rows, typeCountRows] = await Promise.all([
    db
      .select({
        id: bills.id,
        billNumber: bills.billNumber,
        name: bills.name,
        supplierId: bills.supplierId,
        issueDate: bills.issueDate,
        dueDate: bills.dueDate,
        status: bills.status,
        totalAmount: bills.totalAmount,
        billType: bills.billType,
        paidBy: bills.paidBy,
        receiptImageUrl: bills.receiptImageUrl,
        notes: bills.notes,
        createdAt: bills.createdAt,
        supplierName: suppliers.name,
        payerCount: sql<number>`(SELECT COUNT(*)::int FROM bill_payers WHERE bill_id = ${bills.id})`,
        firstPayerName: sql<string | null>`(SELECT person_name FROM bill_payers WHERE bill_id = ${bills.id} ORDER BY id LIMIT 1)`,
      })
      .from(bills)
      .leftJoin(suppliers, eq(bills.supplierId, suppliers.id))
      .where(whereClause)
      .orderBy(orderClause)
      .limit(limit)
      .offset(offset),

    // Count per type — uses base conditions only (no billType, no limit/offset)
    db
      .select({
        billType: bills.billType,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(bills)
      .where(baseConditions.length > 0 ? and(...baseConditions) : undefined)
      .groupBy(bills.billType),
  ]);

  const typeCounts: Record<string, number> = {};
  let total = 0;
  for (const row of typeCountRows) {
    typeCounts[row.billType] = row.count;
    total += row.count;
  }

  return apiResponse({ data: rows, total, typeCounts });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { lineItems, payers, ...billData } = parsed.data;

  // Calculate total from line items
  const total = lineItems.reduce((sum, item) => sum + parseFloat(item.total), 0);

  const [bill] = await db
    .insert(bills)
    .values({
      ...billData,
      billNumber: generateBillNumber(),
      totalAmount: total.toFixed(2),
      issueDate: billData.issueDate ? new Date(billData.issueDate) : new Date(),
      dueDate: billData.dueDate ? new Date(billData.dueDate) : null,
    })
    .returning();

  if (lineItems.length > 0) {
    await db.insert(billLineItems).values(
      lineItems.map((item) => ({
        ...item,
        billId: bill.id,
      }))
    );
    const productIds = lineItems.map((i) => i.productId).filter(Boolean) as string[];
    if (productIds.length > 0) await updateProductAverageCosts(productIds);
  }

  if (payers && payers.length > 0) {
    await db.insert(billPayers).values(
      payers.map((p) => ({
        billId: bill.id,
        personName: p.personName,
        amount: p.amount,
      }))
    );
  }

  return apiResponse(bill, 201);
}
