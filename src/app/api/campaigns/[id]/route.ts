import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { campaigns, campaignProducts, products } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  advertisingBudget: z.string().optional(),
  shippingCost: z.string().optional(),
  otherCosts: z.string().optional(),
  products: z
    .array(
      z.object({
        productId: z.string().uuid(),
        originalPrice: z.string().optional().nullable(),
        campaignPrice: z.string().optional().nullable(),
        cogs: z.string().optional().nullable(),
        expectedUnits: z.number().int().default(0),
      })
    )
    .optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (!campaign) return apiError("Not found", 404);

  const prods = await db
    .select({
      id: campaignProducts.id,
      campaignId: campaignProducts.campaignId,
      productId: campaignProducts.productId,
      originalPrice: campaignProducts.originalPrice,
      campaignPrice: campaignProducts.campaignPrice,
      cogs: campaignProducts.cogs,
      expectedUnits: campaignProducts.expectedUnits,
      productName: products.name,
      productImage: products.imageUrl,
    })
    .from(campaignProducts)
    .leftJoin(products, eq(campaignProducts.productId, products.id))
    .where(eq(campaignProducts.campaignId, id));

  return apiResponse({ ...campaign, products: prods });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { products: prods, startDate, endDate, ...campaignData } = parsed.data;
  const updateData: Record<string, unknown> = { ...campaignData };
  if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

  if (Object.keys(updateData).length > 0) {
    await db.update(campaigns).set(updateData).where(eq(campaigns.id, id));
  }

  if (prods !== undefined) {
    await db.delete(campaignProducts).where(eq(campaignProducts.campaignId, id));
    if (prods.length > 0) {
      await db.insert(campaignProducts).values(prods.map((p) => ({ ...p, campaignId: id })));
    }
  }

  const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id));
  return apiResponse(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  if (session.role !== "admin") return apiError("Forbidden", 403);
  const { id } = await params;
  await db.delete(campaigns).where(eq(campaigns.id, id));
  return apiResponse({ ok: true });
}
