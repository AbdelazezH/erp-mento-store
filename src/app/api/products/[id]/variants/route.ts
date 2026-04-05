import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { productVariants } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  attributeName: z.string().optional().nullable(),
  attributeValue: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  sellingPrice: z.coerce.number().optional().nullable(),
  stockQuantity: z.coerce.number().int().default(0),
});

const syncSchema = z.array(variantSchema);

// POST /api/products/[id]/variants — bulk sync (upsert existing, insert new, delete removed)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id: productId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) return apiError(JSON.stringify(parsed.error.issues), 400);

  const incoming = parsed.data;

  // Delete all existing variants for this product, then re-insert
  // This is simplest and avoids complex diff logic
  await db.delete(productVariants).where(eq(productVariants.productId, productId));

  if (incoming.length === 0) return apiResponse([]);

  const rows = await db
    .insert(productVariants)
    .values(
      incoming.map((v) => ({
        productId,
        name: v.name,
        attributeName: v.attributeName ?? null,
        attributeValue: v.attributeValue ?? null,
        sku: v.sku || null,
        barcode: v.barcode || null,
        imageUrl: v.imageUrl ?? null,
        sellingPrice: v.sellingPrice != null ? String(v.sellingPrice) : null,
        stockQuantity: v.stockQuantity ?? 0,
      }))
    )
    .returning();

  return apiResponse(rows);
}
