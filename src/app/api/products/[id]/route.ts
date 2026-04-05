import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { products, productVariants, productProperties, productImages, categories, suppliers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";



const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  basePrice: z.coerce.number().optional().nullable(),
  sellingPrice: z.coerce.number().optional().nullable(),
  discountPercent: z.coerce.number().optional().nullable(),
  averageCost: z.coerce.number().optional().nullable(),
  stockQuantity: z.number().int().optional(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  hasVariants: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  width: z.coerce.number().optional().nullable(),
  height: z.coerce.number().optional().nullable(),
  material: z.string().optional().nullable(),
  properties: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      supplierId: products.supplierId,
      basePrice: products.basePrice,
      sellingPrice: products.sellingPrice,
      discountPercent: products.discountPercent,
      averageCost: products.averageCost,
      stockQuantity: products.stockQuantity,
      sku: products.sku,
      barcode: products.barcode,
      imageUrl: products.imageUrl,
      hasVariants: products.hasVariants,
      isPublished: products.isPublished,
      width: products.width,
      height: products.height,
      material: products.material,
      createdAt: products.createdAt,
      categoryName: categories.name,
      supplierName: suppliers.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(eq(products.id, id));

  if (!product) return apiError("Not found", 404);

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(asc(productVariants.createdAt));

  const properties = await db
    .select()
    .from(productProperties)
    .where(eq(productProperties.productId, id))
    .orderBy(asc(productProperties.sortOrder));

  const gallery = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(asc(productImages.sortOrder));

  return apiResponse({ ...product, variants, properties, gallery });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { properties, basePrice, sellingPrice, discountPercent, averageCost, width, height, ...restData } = parsed.data;
  const productData = {
    ...restData,
    basePrice: basePrice != null ? String(basePrice) : undefined,
    sellingPrice: sellingPrice != null ? String(sellingPrice) : undefined,
    discountPercent: discountPercent != null ? String(discountPercent) : undefined,
    averageCost: averageCost != null ? String(averageCost) : undefined,
    width: width != null ? String(width) : undefined,
    height: height != null ? String(height) : undefined,
  };

  const [row] = await db.update(products).set(productData).where(eq(products.id, id)).returning();
  if (!row) return apiError("Not found", 404);

  if (properties !== undefined) {
    await db.delete(productProperties).where(eq(productProperties.productId, id));
    if (properties.length > 0) {
      await db.insert(productProperties).values(
        properties.map((p, i) => ({ productId: id, key: p.key, value: p.value, sortOrder: i }))
      );
    }
  }

  return apiResponse(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  if (session.role !== "admin") return apiError("Forbidden", 403);
  const { id } = await params;
  await db.delete(products).where(eq(products.id, id));
  return apiResponse({ ok: true });
}
