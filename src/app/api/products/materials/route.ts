import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { isNotNull, sql } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const rows = await db
    .selectDistinct({ material: products.material, _sort: sql<string>`lower(${products.material})` })
    .from(products)
    .where(isNotNull(products.material))
    .orderBy(sql`lower(${products.material})`);

  return apiResponse(rows.map((r) => r.material).filter(Boolean));
}
