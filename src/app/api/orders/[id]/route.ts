import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { orders, orderLineItems, customers, campaigns, products, productVariants, orderCostProfiles, costProfiles } from "@/lib/db/schema";
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
  costProfileEntries: z.array(z.object({
    costProfileId: z.string().uuid(),
    amount: z.string(),
  })).optional(),
  discountType: z.enum(["percent", "fixed"]).optional().nullable(),
  discountValue: z.string().optional(),
  trackInventory: z.boolean().optional(),
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
      discountType: orders.discountType,
      discountValue: orders.discountValue,
      trackInventory: orders.trackInventory,
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

  const costProfileEntries = await db
    .select({
      id: orderCostProfiles.id,
      costProfileId: orderCostProfiles.costProfileId,
      amount: orderCostProfiles.amount,
      profileName: costProfiles.name,
      profileCategory: costProfiles.category,
      applicationRule: costProfiles.applicationRule,
      unitCost: costProfiles.unitCost,
    })
    .from(orderCostProfiles)
    .innerJoin(costProfiles, eq(orderCostProfiles.costProfileId, costProfiles.id))
    .where(eq(orderCostProfiles.orderId, id));

  return apiResponse({ ...order, lineItems, costProfileEntries });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { lineItems, costProfileEntries, orderDate, ...orderData } = parsed.data;
  const updateData: Record<string, unknown> = { ...orderData };
  if (orderDate) updateData.orderDate = new Date(orderDate);

  if (lineItems !== undefined || costProfileEntries !== undefined || orderData.discountType !== undefined || orderData.discountValue !== undefined) {
    // Use provided values or fetch existing ones for recalculation
    const effectiveLineItems = lineItems ?? (await db.select().from(orderLineItems).where(eq(orderLineItems.orderId, id)));
    const effectiveCostEntries = costProfileEntries ?? (await db.select().from(orderCostProfiles).where(eq(orderCostProfiles.orderId, id)));

    const totalAmount = effectiveLineItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const totalCost = effectiveLineItems.reduce((sum, item) => sum + parseFloat(item.unitCost) * item.quantity, 0);
    const cpTotal = effectiveCostEntries.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const shippingFee = orderData.shippingFee !== undefined ? parseFloat(orderData.shippingFee) : null;
    const shippingDiscount = orderData.shippingDiscount !== undefined ? parseFloat(orderData.shippingDiscount) : null;
    // Fetch existing shipping if not provided
    let shippingNet: number;
    if (shippingFee !== null && shippingDiscount !== null) {
      shippingNet = Math.max(0, shippingFee - shippingDiscount);
    } else {
      const [existing] = await db.select({ shippingFee: orders.shippingFee, shippingDiscount: orders.shippingDiscount }).from(orders).where(eq(orders.id, id));
      const fee = shippingFee !== null ? String(shippingFee) : (existing.shippingFee ?? "0");
      const disc = shippingDiscount !== null ? String(shippingDiscount) : (existing.shippingDiscount ?? "0");
      shippingNet = Math.max(0, parseFloat(fee) - parseFloat(disc));
    }

    const discountType = orderData.discountType !== undefined ? orderData.discountType : (await db.select({ discountType: orders.discountType }).from(orders).where(eq(orders.id, id)))[0]?.discountType;
    const discountValue = orderData.discountValue !== undefined ? orderData.discountValue : (await db.select({ discountValue: orders.discountValue }).from(orders).where(eq(orders.id, id)))[0]?.discountValue;

    let orderDiscount = 0;
    if (discountType === "percent") {
      orderDiscount = (totalAmount + shippingNet) * (parseFloat(discountValue ?? "0") / 100);
    } else if (discountType === "fixed") {
      orderDiscount = parseFloat(discountValue ?? "0");
    }
    orderDiscount = Math.min(orderDiscount, totalAmount + shippingNet);

    updateData.totalAmount = totalAmount.toFixed(2);
    updateData.totalCost = totalCost.toFixed(2);
    updateData.profit = (totalAmount + shippingNet - orderDiscount - totalCost - cpTotal).toFixed(2);
  }

  if (lineItems !== undefined) {
    await db.delete(orderLineItems).where(eq(orderLineItems.orderId, id));
    if (lineItems.length > 0) {
      await db.insert(orderLineItems).values(
        lineItems.map(({ id: _, ...item }) => ({ ...item, orderId: id }))
      );
    }
  }

  if (costProfileEntries !== undefined) {
    await db.delete(orderCostProfiles).where(eq(orderCostProfiles.orderId, id));
    if (costProfileEntries.length > 0) {
      await db.insert(orderCostProfiles).values(
        costProfileEntries.map((entry) => ({ ...entry, orderId: id }))
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
