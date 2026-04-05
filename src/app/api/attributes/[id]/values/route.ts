import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { attributeValues } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  value: z.string().min(1),
  colorHex: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const { id: attributeId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError("Invalid input", 400);

  const [inserted] = await db
    .insert(attributeValues)
    .values({
      attributeId,
      value: parsed.data.value,
      colorHex: parsed.data.colorHex ?? null,
      sortOrder: 0,
    })
    .returning();

  return apiResponse(inserted, 201);
}
