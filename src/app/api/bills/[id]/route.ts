import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { bills, billLineItems, suppliers, products, productVariants } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";

const lineItemSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid().optional().nullable(),
  variantId: z.string().uuid().optional().nullable(),
  description: z.string().min(1),
  quantity: z.string().default("1"),
  unitPrice: z.string(),
  discountPercent: z.string().default("0"),
  total: z.string(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  supplierId: z.string().uuid().optional().nullable(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(["pending", "overdue", "paid", "cancelled"]).optional(),
  billType: z.enum(["supplier_bill", "other_expense", "operation_invoice", "packaging_invoice", "shipping_invoice", "devices_invoice", "website_invoice"]).optional(),
  paidBy: z.string().optional().nullable(),
  receiptImageUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const [bill] = await db
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
    })
    .from(bills)
    .leftJoin(suppliers, eq(bills.supplierId, suppliers.id))
    .where(eq(bills.id, id));

  if (!bill) return apiError("Not found", 404);

  const lineItems = await db
    .select({
      id: billLineItems.id,
      productId: billLineItems.productId,
      variantId: billLineItems.variantId,
      description: billLineItems.description,
      quantity: billLineItems.quantity,
      unitPrice: billLineItems.unitPrice,
      discountPercent: billLineItems.discountPercent,
      total: billLineItems.total,
      productName: products.name,
      variantName: productVariants.name,
    })
    .from(billLineItems)
    .leftJoin(products, eq(billLineItems.productId, products.id))
    .leftJoin(productVariants, eq(billLineItems.variantId, productVariants.id))
    .where(eq(billLineItems.billId, id));

  return apiResponse({ ...bill, lineItems });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { lineItems, issueDate, dueDate, ...billData } = parsed.data;

  const updateData: Record<string, unknown> = { ...billData };
  if (issueDate) updateData.issueDate = new Date(issueDate);
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

  if (lineItems !== undefined) {
    const total = lineItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
    updateData.totalAmount = total.toFixed(2);

    // Replace all line items
    await db.delete(billLineItems).where(eq(billLineItems.billId, id));
    if (lineItems.length > 0) {
      await db.insert(billLineItems).values(
        lineItems.map(({ id: _, ...item }) => ({ ...item, billId: id }))
      );
    }
  }

  const [row] = await db.update(bills).set(updateData).where(eq(bills.id, id)).returning();
  if (!row) return apiError("Not found", 404);
  return apiResponse(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  if (session.role !== "admin") return apiError("Forbidden", 403);
  const { id } = await params;
  await db.delete(bills).where(eq(bills.id, id));
  return apiResponse({ ok: true });
}
