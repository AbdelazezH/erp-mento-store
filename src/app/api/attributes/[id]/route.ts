import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { attributes, attributeValues } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["text", "color"]).optional(),
  values: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        value: z.string().min(1),
        colorHex: z.string().optional().nullable(),
        sortOrder: z.number().int().default(0),
      })
    )
    .optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const [attr] = await db.select().from(attributes).where(eq(attributes.id, id));
  if (!attr) return apiError("Not found", 404);

  const values = await db
    .select()
    .from(attributeValues)
    .where(eq(attributeValues.attributeId, id))
    .orderBy(asc(attributeValues.sortOrder));

  return apiResponse({ ...attr, values });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { values, ...attrData } = parsed.data;

  if (Object.keys(attrData).length > 0) {
    await db.update(attributes).set(attrData).where(eq(attributes.id, id));
  }

  if (values !== undefined) {
    await db.delete(attributeValues).where(eq(attributeValues.attributeId, id));
    if (values.length > 0) {
      await db.insert(attributeValues).values(
        values.map(({ id: _, ...v }) => ({ ...v, attributeId: id }))
      );
    }
  }

  const [attr] = await db.select().from(attributes).where(eq(attributes.id, id));
  return apiResponse(attr);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  if (session.role !== "admin") return apiError("Forbidden", 403);
  const { id } = await params;
  await db.delete(attributes).where(eq(attributes.id, id));
  return apiResponse({ ok: true });
}
