import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { orders, orderLineItems, customers, campaigns, products, productVariants } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";

const lineItemSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid().optional().nullable(),
  variantId: z.string().uuid().optional().nullable(),
  productName: z.string().min(1),
  variantName: z.string().optional().nullable(),
  quantity: z.number().int().min(1),
  unitPrice: z.string(),
  unitCost: z.string().default("0"),
  total: z.string(),
  profit: z.string().default("0"),
  isFree: z.boolean().default(false),
  originalUnitPrice: z.string().optional().nullable(),
});

const updateSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
  orderDate: z.string().optional(),
  status: z.enum(["draft", "pending", "delivered", "cancelled"]).optional(),
  shippingFee: z.string().optional(),
  shippingDiscount: z.string().optional(),
  shippingDiscountReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customerFeedback: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      orderDate: orders.orderDate,
      status: orders.status,
      totalAmount: orders.totalAmount,
      totalCost: orders.totalCost,
      profit: orders.profit,
      shippingFee: orders.shippingFee,
      shippingDiscount: orders.shippingDiscount,
      shippingDiscountReason: orders.shippingDiscountReason,
      notes: orders.notes,
      customerFeedback: orders.customerFeedback,
      createdAt: orders.createdAt,
      campaignId: orders.campaignId,
      customerName: customers.name,
      campaignName: campaigns.name,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(campaigns, eq(orders.campaignId, campaigns.id))
    .where(eq(orders.id, id));

  if (!order) return apiError("Not found", 404);

  const lineItems = await db
    .select({
      id: orderLineItems.id,
      productId: orderLineItems.productId,
      variantId: orderLineItems.variantId,
      productName: orderLineItems.productName,
      variantName: orderLineItems.variantName,
      quantity: orderLineItems.quantity,
      unitPrice: orderLineItems.unitPrice,
      unitCost: orderLineItems.unitCost,
      total: orderLineItems.total,
      profit: orderLineItems.profit,
      isFree: orderLineItems.isFree,
      originalUnitPrice: orderLineItems.originalUnitPrice,
      productImage: products.imageUrl,
    })
    .from(orderLineItems)
    .leftJoin(products, eq(orderLineItems.productId, products.id))
    .where(eq(orderLineItems.orderId, id));

  return apiResponse({ ...order, lineItems });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { lineItems, orderDate, ...orderData } = parsed.data;
  const updateData: Record<string, unknown> = { ...orderData };
  if (orderDate) updateData.orderDate = new Date(orderDate);

  if (lineItems !== undefined) {
    const totalAmount = lineItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const totalCost = lineItems.reduce((sum, item) => sum + parseFloat(item.unitCost) * item.quantity, 0);
    updateData.totalAmount = totalAmount.toFixed(2);
    updateData.totalCost = totalCost.toFixed(2);
    updateData.profit = (totalAmount - totalCost).toFixed(2);

    await db.delete(orderLineItems).where(eq(orderLineItems.orderId, id));
    if (lineItems.length > 0) {
      await db.insert(orderLineItems).values(
        lineItems.map(({ id: _, ...item }) => ({ ...item, orderId: id }))
      );
    }
  }

  const [row] = await db.update(orders).set(updateData).where(eq(orders.id, id)).returning();
  if (!row) return apiError("Not found", 404);
  return apiResponse(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  if (session.role !== "admin") return apiError("Forbidden", 403);
  const { id } = await params;
  await db.delete(orders).where(eq(orders.id, id));
  return apiResponse({ ok: true });
}
