import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { products, categories, suppliers, productVariants } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { asc, desc, eq, ilike, and, or, sql } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  basePrice: z.coerce.number().min(0).optional().nullable(),
  sellingPrice: z.coerce.number().min(0).optional().nullable(),
  discountPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  stockQuantity: z.number().int().default(0),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  hasVariants: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  width: z.coerce.number().optional().nullable(),
  height: z.coerce.number().optional().nullable(),
  material: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("categoryId");
  const supplierId = searchParams.get("supplierId");
  const lowStock = searchParams.get("lowStock") === "true";

  const conditions = [];
  if (search) conditions.push(ilike(products.name, `%${search}%`));
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));
  if (supplierId) conditions.push(eq(products.supplierId, supplierId));
  if (lowStock) conditions.push(sql`${products.stockQuantity} < 10`);

  const rows = await db
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
      createdAt: products.createdAt,
      categoryName: categories.name,
      supplierName: suppliers.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(products.createdAt));

  return apiResponse(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { basePrice, sellingPrice, discountPercent, width, height, ...rest } = parsed.data;
  const [row] = await db.insert(products).values({
    ...rest,
    basePrice: basePrice != null ? String(basePrice) : null,
    sellingPrice: sellingPrice != null ? String(sellingPrice) : null,
    discountPercent: discountPercent != null ? String(discountPercent) : null,
    width: width != null ? String(width) : null,
    height: height != null ? String(height) : null,
  }).returning();
  return apiResponse(row, 201);
}
