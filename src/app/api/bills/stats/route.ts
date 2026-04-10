import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { billPayers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { sql, sum, count } from "drizzle-orm";

export async function GET(_: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const rows = await db
    .select({
      personName: billPayers.personName,
      total: sum(billPayers.amount),
      count: count(billPayers.billId),
    })
    .from(billPayers)
    .groupBy(billPayers.personName)
    .orderBy(sql`sum(${billPayers.amount}) desc`);

  return apiResponse(rows);
}
