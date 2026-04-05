import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { apiError, apiResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function PUT(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return apiError("Unauthorized", 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400);

  const { currentPassword, newPassword } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user || !user.password) return apiError("User not found", 404);

  const { valid } = await verifyPassword(currentPassword, user.password);
  if (!valid) return apiError("Current password is incorrect", 401);

  await db
    .update(users)
    .set({ password: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, session.userId));

  return apiResponse({ ok: true });
}
