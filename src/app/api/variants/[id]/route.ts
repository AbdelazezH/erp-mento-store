import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { productVariants } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  attributeName: z.string().optional().nullable(),
  attributeValue: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  additionalCost: z.string().optional().nullable(),
  sellingPrice: z.string().optional().nullable(),
  stockQuantity: z.number().int().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const [row] = await db.update(productVariants).set(parsed.data).where(eq(productVariants.id, id)).returning();
  if (!row) return apiError("Not found", 404);
  return apiResponse(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;
  await db.delete(productVariants).where(eq(productVariants.id, id));
  return apiResponse({ ok: true });
}
