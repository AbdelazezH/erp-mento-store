import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { orders, orderLineItems, bills } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { sql, eq, and, gte, lte, ne, sum } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

  // Build date range: first and last moment of the given month
  const dateFrom = new Date(year, month - 1, 1);
  const dateTo = new Date(year, month, 0, 23, 59, 59, 999); // last day of month

  const [orderStats, freeItemsRow, expensesRow] = await Promise.all([
    // Revenue, COGS, shipping discounts from delivered orders in the period
    db
      .select({
        salesRevenue: sum(orders.totalAmount),
        costOfGoods: sum(orders.totalCost),
        shippingDiscounts: sum(orders.shippingDiscount),
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, "delivered"),
          gte(orders.orderDate, dateFrom),
          lte(orders.orderDate, dateTo),
        ),
      )
      .then((r) => r[0]),

    // Free items value: quantity × original_unit_price for free line items in delivered orders in period
    db
      .select({
        total: sql<string>`COALESCE(SUM(${orderLineItems.quantity} * COALESCE(${orderLineItems.originalUnitPrice}::numeric, 0)), 0)`,
      })
      .from(orderLineItems)
      .innerJoin(orders, eq(orderLineItems.orderId, orders.id))
      .where(
        and(
          eq(orderLineItems.isFree, true),
          eq(orders.status, "delivered"),
          gte(orders.orderDate, dateFrom),
          lte(orders.orderDate, dateTo),
        ),
      )
      .then((r) => r[0].total),

    // Operating expenses: non-supplier bills issued in the period
    db
      .select({ total: sum(bills.totalAmount) })
      .from(bills)
      .where(
        and(
          ne(bills.billType, "supplier_bill"),
          gte(bills.issueDate, dateFrom),
          lte(bills.issueDate, dateTo),
        ),
      )
      .then((r) => r[0].total),
  ]);

  const salesRevenue = parseFloat(orderStats.salesRevenue ?? "0");
  const costOfGoods = parseFloat(orderStats.costOfGoods ?? "0");
  const shippingDiscounts = parseFloat(orderStats.shippingDiscounts ?? "0");
  const freeItemsValue = parseFloat(freeItemsRow ?? "0");
  const operatingExpenses = parseFloat(expensesRow ?? "0");

  const trueNetProfit = salesRevenue - costOfGoods - operatingExpenses - shippingDiscounts - freeItemsValue;
  const margin = salesRevenue > 0 ? ((trueNetProfit / salesRevenue) * 100).toFixed(1) : "0";

  return apiResponse({
    salesRevenue,
    costOfGoods,
    operatingExpenses,
    shippingDiscounts,
    freeItemsValue,
    trueNetProfit,
    margin,
  });
}
