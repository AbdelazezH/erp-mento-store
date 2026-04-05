import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { asc } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const rows = await db.select().from(categories).orderBy(asc(categories.name));
  return apiResponse(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const [row] = await db.insert(categories).values(parsed.data).returning();
  return apiResponse(row, 201);
}
