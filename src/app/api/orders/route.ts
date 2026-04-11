import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { orders, orderLineItems, customers, campaigns, products, productVariants } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse, generateOrderNumber } from "@/lib/utils";
import { desc, eq, ilike, and, sql, count as drizzleCount } from "drizzle-orm";
import { z } from "zod";

const lineItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  variantId: z.string().uuid().optional().nullable(),
  productName: z.string().min(1),
  variantName: z.string().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.string(),
  unitCost: z.string().default("0"),
  total: z.string(),
  profit: z.string().default("0"),
  isFree: z.boolean().default(false),
  originalUnitPrice: z.string().optional().nullable(),
});

const createSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
  orderDate: z.string().optional(),
  status: z.enum(["draft", "pending", "delivered", "cancelled"]).default("pending"),
  shippingFee: z.string().default("0"),
  shippingDiscount: z.string().default("0"),
  shippingDiscountReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customerFeedback: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).default([]),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status");

  const conditions = [];
  if (status) conditions.push(eq(orders.status, status as "draft" | "pending" | "delivered" | "cancelled"));

  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
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
        customerName: customers.name,
        customerPhone: customers.phone,
        campaignId: orders.campaignId,
        campaignName: campaigns.name,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(campaigns, eq(orders.campaignId, campaigns.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset),

    db.select({ total: sql<number>`COUNT(*)::int` }).from(orders).where(whereClause),
  ]);

  return apiResponse({ data: rows, total });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { lineItems, ...orderData } = parsed.data;

  // Calculate totals
  const totalAmount = lineItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
  const totalCost = lineItems.reduce((sum, item) => sum + parseFloat(item.unitCost) * item.quantity, 0);
  const profit = totalAmount - totalCost;

  const [order] = await db
    .insert(orders)
    .values({
      ...orderData,
      orderNumber: generateOrderNumber(),
      totalAmount: totalAmount.toFixed(2),
      totalCost: totalCost.toFixed(2),
      profit: profit.toFixed(2),
      orderDate: orderData.orderDate ? new Date(orderData.orderDate) : new Date(),
    })
    .returning();

  if (lineItems.length > 0) {
    await db.insert(orderLineItems).values(
      lineItems.map((item) => ({ ...item, orderId: order.id }))
    );
  }

  return apiResponse(order, 201);
}
