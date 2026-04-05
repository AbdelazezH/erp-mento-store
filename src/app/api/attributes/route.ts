import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { attributes, attributeValues } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["text", "color"]).default("text"),
  values: z
    .array(
      z.object({
        value: z.string().min(1),
        colorHex: z.string().optional().nullable(),
        sortOrder: z.number().int().default(0),
      })
    )
    .default([]),
});

export async function GET() {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const attrs = await db.select().from(attributes).orderBy(asc(attributes.name));
  const values = await db.select().from(attributeValues).orderBy(asc(attributeValues.sortOrder));

  const result = attrs.map((attr) => ({
    ...attr,
    values: values.filter((v) => v.attributeId === attr.id),
  }));

  return apiResponse(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { values, ...attrData } = parsed.data;
  const [attr] = await db.insert(attributes).values(attrData).returning();

  if (values.length > 0) {
    await db.insert(attributeValues).values(
      values.map((v) => ({ ...v, attributeId: attr.id }))
    );
  }

  return apiResponse(attr, 201);
}
