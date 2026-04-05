import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { campaigns, campaignProducts, products } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

const campaignProductSchema = z.object({
  productId: z.string().uuid(),
  originalPrice: z.string().optional().nullable(),
  campaignPrice: z.string().optional().nullable(),
  cogs: z.string().optional().nullable(),
  expectedUnits: z.number().int().default(0),
});

const createSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  advertisingBudget: z.string().default("0"),
  shippingCost: z.string().default("0"),
  otherCosts: z.string().default("0"),
  products: z.array(campaignProductSchema).default([]),
});

export async function GET() {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const allCampaigns = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  const allCampaignProducts = await db
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
    .leftJoin(products, eq(campaignProducts.productId, products.id));

  const result = allCampaigns.map((c) => {
    const cProds = allCampaignProducts.filter((p) => p.campaignId === c.id);

    // Calculate profitability
    const totalRevenue = cProds.reduce(
      (sum, p) => sum + parseFloat(p.campaignPrice ?? "0") * (p.expectedUnits ?? 0),
      0
    );
    const totalCOGS = cProds.reduce(
      (sum, p) => sum + parseFloat(p.cogs ?? "0") * (p.expectedUnits ?? 0),
      0
    );
    const totalExpenses =
      parseFloat(c.advertisingBudget ?? "0") +
      parseFloat(c.shippingCost ?? "0") +
      parseFloat(c.otherCosts ?? "0");
    const netProfit = totalRevenue - totalCOGS - totalExpenses;

    let verdict: "profitable" | "loss" | "break_even" = "break_even";
    if (netProfit > 0) verdict = "profitable";
    else if (netProfit < 0) verdict = "loss";

    return { ...c, products: cProds, totalRevenue, totalCOGS, totalExpenses, netProfit, verdict };
  });

  return apiResponse(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { products: prods, startDate, endDate, ...campaignData } = parsed.data;

  const [campaign] = await db
    .insert(campaigns)
    .values({
      ...campaignData,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    })
    .returning();

  if (prods.length > 0) {
    await db.insert(campaignProducts).values(
      prods.map((p) => ({ ...p, campaignId: campaign.id }))
    );
  }

  return apiResponse(campaign, 201);
}
