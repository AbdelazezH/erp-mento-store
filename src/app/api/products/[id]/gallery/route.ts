import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { productImages } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

const saveSchema = z.array(
  z.object({
    imageUrl: z.string().min(1),
    sortOrder: z.number().int().default(0),
  })
);

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(asc(productImages.sortOrder));

  return apiResponse(images);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  // Delete all existing, insert fresh
  await db.delete(productImages).where(eq(productImages.productId, id));

  if (parsed.data.length > 0) {
    await db.insert(productImages).values(
      parsed.data.map((img, i) => ({
        productId: id,
        imageUrl: img.imageUrl,
        sortOrder: img.sortOrder ?? i,
      }))
    );
  }

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(asc(productImages.sortOrder));

  return apiResponse(images);
}
