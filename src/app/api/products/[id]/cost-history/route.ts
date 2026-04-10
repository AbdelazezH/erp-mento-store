import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { billLineItems, bills, suppliers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq, desc } from "drizzle-orm";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const rows = await db
    .select({
      billId: bills.id,
      billNumber: bills.billNumber,
      issueDate: bills.issueDate,
      quantity: billLineItems.quantity,
      unitPrice: billLineItems.unitPrice,
      discountPercent: billLineItems.discountPercent,
      discountType: billLineItems.discountType,
      total: billLineItems.total,
      supplierName: suppliers.name,
    })
    .from(billLineItems)
    .innerJoin(bills, eq(billLineItems.billId, bills.id))
    .leftJoin(suppliers, eq(bills.supplierId, suppliers.id))
    .where(eq(billLineItems.productId, id))
    .orderBy(desc(bills.issueDate));

  return apiResponse(rows);
}
