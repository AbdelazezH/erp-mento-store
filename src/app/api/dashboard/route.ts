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
import { sql, eq, and, sum, count, avg, ne, inArray } from "drizzle-orm";

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
    expectedInventoryProfit,
    lowStockProducts,
    categoryAnalytics,
    recentOrders,
    totalInvestment,
    totalGoods,
    totalExpensesAllTime,
    topProducts,
    investmentByCategory,
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

    // Bill stats (pending count)
    db
      .select({
        pendingBills: count(),
      })
      .from(bills)
      .where(eq(bills.status, "pending"))
      .then((r) => r[0]),

    // Inventory value: for variant products use SUM(variant.stock * (base_price + additional_cost)),
    // for simple products use stock_quantity * base_price.
    // Uses raw SQL names to avoid Drizzle aliasing issues inside correlated subqueries.
    db
      .select({
        value: sql<string>`
          SUM(
            CASE WHEN has_variants = true THEN
              COALESCE((
                SELECT SUM(pv.stock_quantity * (COALESCE(products.base_price::numeric, 0) + COALESCE(pv.additional_cost::numeric, 0)))
                FROM product_variants pv
                WHERE pv.product_id = products.id
              ), 0)
            ELSE
              COALESCE(products.stock_quantity * products.base_price::numeric, 0)
            END
          )
        `,
      })
      .from(products)
      .then((r) => r[0].value),

    // Expected inventory profit: for variant products use variant stock * (selling_price - base_price - additional_cost),
    // for simple products use stock_quantity * (selling_price - base_price)
    db
      .select({
        value: sql<string>`
          SUM(
            CASE WHEN has_variants = true THEN
              COALESCE((
                SELECT SUM(pv.stock_quantity * (
                  COALESCE(COALESCE(pv.selling_price, products.selling_price)::numeric, 0)
                  - COALESCE(products.base_price::numeric, 0)
                  - COALESCE(pv.additional_cost::numeric, 0)
                ))
                FROM product_variants pv
                WHERE pv.product_id = products.id
              ), 0)
            ELSE
              COALESCE((products.selling_price::numeric - products.base_price::numeric) * products.stock_quantity, 0)
            END
          )
        `,
      })
      .from(products)
      .where(sql`products.base_price IS NOT NULL`)
      .then((r) => r[0].value),

    // Low stock products (< 10), correctly handles variant products
    db
      .select({ count: count() })
      .from(products)
      .where(sql`
        CASE WHEN has_variants = true THEN
          COALESCE((SELECT SUM(pv.stock_quantity) FROM product_variants pv WHERE pv.product_id = products.id), 0)
        ELSE
          products.stock_quantity
        END < 10
      `)
      .then((r) => r[0].count),

    // Category analytics: revenue + cost per category (delivered orders only)
    db
      .select({
        categoryName: categories.name,
        revenue: sql<string>`COALESCE(SUM(${orderLineItems.total}::numeric), 0)`,
        cost: sql<string>`COALESCE(SUM(${orderLineItems.unitCost}::numeric * ${orderLineItems.quantity}), 0)`,
        units: sql<string>`COALESCE(SUM(${orderLineItems.quantity}), 0)`,
      })
      .from(orderLineItems)
      .innerJoin(orders, eq(orderLineItems.orderId, orders.id))
      .innerJoin(products, eq(orderLineItems.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(orders.status, "delivered"))
      .groupBy(categories.name)
      .orderBy(sql`SUM(${orderLineItems.total}::numeric) DESC`)
      .limit(10),

    // Recent orders
    db.select().from(orders).orderBy(sql`${orders.createdAt} DESC`).limit(5),

    // Total Investment: ALL bills regardless of status
    db
      .select({ total: sum(bills.totalAmount) })
      .from(bills)
      .then((r) => r[0].total),

    // Total Goods: supplier_bill type only, all statuses
    db
      .select({ total: sum(bills.totalAmount) })
      .from(bills)
      .where(eq(bills.billType, "supplier_bill"))
      .then((r) => r[0].total),

    // Total Expenses (all time): everything except supplier_bill
    db
      .select({ total: sum(bills.totalAmount) })
      .from(bills)
      .where(ne(bills.billType, "supplier_bill"))
      .then((r) => r[0].total),

    // Top selling products by revenue (delivered orders)
    db
      .select({
        productName: products.name,
        units: sql<string>`COALESCE(SUM(${orderLineItems.quantity}), 0)`,
        revenue: sql<string>`COALESCE(SUM(${orderLineItems.total}::numeric), 0)`,
      })
      .from(orderLineItems)
      .innerJoin(orders, eq(orderLineItems.orderId, orders.id))
      .innerJoin(products, eq(orderLineItems.productId, products.id))
      .where(eq(orders.status, "delivered"))
      .groupBy(products.id, products.name)
      .orderBy(sql`SUM(${orderLineItems.total}::numeric) DESC`)
      .limit(10),

    // Investment by bill type
    db
      .select({
        billType: bills.billType,
        total: sql<string>`COALESCE(SUM(${bills.totalAmount}::numeric), 0)`,
      })
      .from(bills)
      .groupBy(bills.billType)
      .orderBy(sql`SUM(${bills.totalAmount}::numeric) DESC`),
  ]);

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
    inventoryValue: inventoryValue ?? "0",
    expectedInventoryProfit: expectedInventoryProfit ?? "0",
    lowStockCount: lowStockProducts,
    categoryAnalytics,
    recentOrders,
    totalInvestment: totalInvestment ?? "0",
    totalGoods: totalGoods ?? "0",
    totalExpensesAllTime: totalExpensesAllTime ?? "0",
    topProducts,
    investmentByCategory,
  });
}
