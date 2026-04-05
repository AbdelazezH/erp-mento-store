import { db } from "@/lib/db";
import {
  products,
  categories,
  suppliers,
  customers,
  orders,
  bills,
  billLineItems,
  orderLineItems,
  productVariants,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { sql, eq, and, sum, count, avg } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const [
    productCount,
    categoryCount,
    supplierCount,
    customerCount,
    orderStats,
    billStats,
    inventoryValue,
    lowStockProducts,
    categoryAnalytics,
    recentOrders,
  ] = await Promise.all([
    // Product count
    db.select({ count: count() }).from(products).then((r) => r[0].count),

    // Category count
    db.select({ count: count() }).from(categories).then((r) => r[0].count),

    // Supplier count
    db.select({ count: count() }).from(suppliers).then((r) => r[0].count),

    // Customer count
    db.select({ count: count() }).from(customers).then((r) => r[0].count),

    // Order stats (delivered only for revenue)
    db
      .select({
        totalRevenue: sum(orders.totalAmount),
        totalCost: sum(orders.totalCost),
        totalProfit: sum(orders.profit),
        orderCount: count(),
      })
      .from(orders)
      .where(eq(orders.status, "delivered"))
      .then((r) => r[0]),

    // Bill stats
    db
      .select({
        totalExpenses: sum(bills.totalAmount),
        pendingBills: count(),
      })
      .from(bills)
      .where(eq(bills.status, "pending"))
      .then((r) => r[0]),

    // Inventory value (stockQuantity * averageCost)
    db
      .select({
        value: sql<string>`SUM(COALESCE(${products.stockQuantity} * ${products.averageCost}::numeric, 0))`,
      })
      .from(products)
      .then((r) => r[0].value),

    // Low stock products (< 10)
    db
      .select({ count: count() })
      .from(products)
      .where(sql`${products.stockQuantity} < 10`)
      .then((r) => r[0].count),

    // Category analytics: revenue per category
    db
      .select({
        categoryName: categories.name,
        revenue: sql<string>`SUM(${orderLineItems.total})`,
        units: sql<string>`SUM(${orderLineItems.quantity})`,
      })
      .from(orderLineItems)
      .innerJoin(products, eq(orderLineItems.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .groupBy(categories.name)
      .orderBy(sql`SUM(${orderLineItems.total}) DESC`)
      .limit(10),

    // Recent orders
    db.select().from(orders).orderBy(sql`${orders.createdAt} DESC`).limit(5),
  ]);

  // Total expenses (all bills)
  const totalExpensesResult = await db
    .select({ total: sum(bills.totalAmount) })
    .from(bills)
    .where(eq(bills.status, "paid"));

  return apiResponse({
    productCount,
    categoryCount,
    supplierCount,
    customerCount,
    totalRevenue: orderStats.totalRevenue ?? "0",
    totalCost: orderStats.totalCost ?? "0",
    totalProfit: orderStats.totalProfit ?? "0",
    orderCount: orderStats.orderCount,
    pendingBillCount: billStats.pendingBills,
    totalExpenses: totalExpensesResult[0].total ?? "0",
    inventoryValue: inventoryValue ?? "0",
    lowStockCount: lowStockProducts,
    categoryAnalytics,
    recentOrders,
  });
}
