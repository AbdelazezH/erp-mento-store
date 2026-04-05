import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  role: z.enum(["admin", "worker"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return apiError("Forbidden", 403);
  }

  const { id } = await params;

  // Prevent admin from demoting themselves
  if (id === session.userId) {
    const body = await req.json().catch(() => ({}));
    if (body.role === "worker") return apiError("You cannot demote yourself", 400);
    if (body.isActive === false) return apiError("You cannot deactivate yourself", 400);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const [row] = await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
    });

  if (!row) return apiError("User not found", 404);
  return apiResponse(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return apiError("Forbidden", 403);
  }

  const { id } = await params;

  if (id === session.userId) return apiError("You cannot delete your own account", 400);

  await db.delete(users).where(eq(users.id, id));
  return apiResponse({ ok: true });
}
