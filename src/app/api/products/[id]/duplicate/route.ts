import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  products,
  productVariants,
  productProperties,
  productImages,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq, asc } from "drizzle-orm";

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const [source] = await db.select().from(products).where(eq(products.id, id));
  if (!source) return apiError("Not found", 404);

  const [variantRows, propertyRows, imageRows] = await Promise.all([
    db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(asc(productVariants.createdAt)),
    db
      .select()
      .from(productProperties)
      .where(eq(productProperties.productId, id))
      .orderBy(asc(productProperties.sortOrder)),
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.sortOrder)),
  ]);

  const [copy] = await db
    .insert(products)
    .values({
      name: `${source.name} (Copy)`,
      description: source.description,
      categoryId: source.categoryId,
      supplierId: source.supplierId,
      basePrice: source.basePrice,
      sellingPrice: source.sellingPrice,
      discountPercent: source.discountPercent,
      averageCost: "0",
      stockQuantity: 0,
      sku: null,
      barcode: null,
      imageUrl: source.imageUrl,
      hasVariants: source.hasVariants,
      isPublished: false,
      width: source.width,
      height: source.height,
      material: source.material,
    })
    .returning();

  if (variantRows.length > 0) {
    await db.insert(productVariants).values(
      variantRows.map((v) => ({
        productId: copy.id,
        name: v.name,
        attributeName: v.attributeName,
        attributeValue: v.attributeValue,
        sku: null,
        barcode: null,
        imageUrl: v.imageUrl,
        additionalCost: v.additionalCost,
        sellingPrice: v.sellingPrice,
        stockQuantity: 0,
      })),
    );
  }

  if (propertyRows.length > 0) {
    await db.insert(productProperties).values(
      propertyRows.map((p) => ({
        productId: copy.id,
        key: p.key,
        value: p.value,
        sortOrder: p.sortOrder,
      })),
    );
  }

  if (imageRows.length > 0) {
    await db.insert(productImages).values(
      imageRows.map((img) => ({
        productId: copy.id,
        imageUrl: img.imageUrl,
        sortOrder: img.sortOrder,
      })),
    );
  }

  return apiResponse(copy, 201);
}
