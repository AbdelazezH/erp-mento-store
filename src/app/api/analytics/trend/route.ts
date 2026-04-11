import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { sql, eq, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const groupBy = searchParams.get("groupBy") ?? "monthly";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (!dateFrom || !dateTo) return apiError("dateFrom and dateTo are required", 400);

  const truncMap: Record<string, string> = {
    daily: "day",
    weekly: "week",
    monthly: "month",
    yearly: "year",
  };
  const trunc = truncMap[groupBy] ?? "month";

  const rows = await db
    .select({
      period: sql<string>`DATE_TRUNC(${trunc}, ${orders.orderDate})::text`,
      revenue: sql<string>`COALESCE(SUM(${orders.totalAmount}::numeric), 0)`,
      profit: sql<string>`COALESCE(SUM(${orders.profit}::numeric), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, "delivered"),
        gte(orders.orderDate, new Date(dateFrom)),
        lte(orders.orderDate, new Date(dateTo + "T23:59:59")),
      ),
    )
    .groupBy(sql`DATE_TRUNC(${trunc}, ${orders.orderDate})`)
    .orderBy(sql`DATE_TRUNC(${trunc}, ${orders.orderDate})`);

  // Format period label for display
  const data = rows.map((row) => {
    const d = new Date(row.period);
    let label = "";
    if (groupBy === "daily") label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    else if (groupBy === "weekly") label = `W${getISOWeek(d)} '${String(d.getFullYear()).slice(2)}`;
    else if (groupBy === "monthly") label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    else label = String(d.getFullYear());

    return {
      period: label,
      revenue: parseFloat(row.revenue),
      profit: parseFloat(row.profit),
    };
  });

  return apiResponse({ data });
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
