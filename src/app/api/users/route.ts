import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return apiError("Forbidden", 403);
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));

  return apiResponse(rows);
}
