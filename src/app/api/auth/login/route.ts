import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { apiError, apiResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid credentials", 400);

  const { email, password } = parsed.data;

  // Seed default admin on very first run (no users in DB yet)
  const existing = await db.select().from(users).limit(1);
  if (existing.length === 0) {
    await db.insert(users).values({
      email: "admin@nexus.local",
      password: await hashPassword("admin"),
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !user.password) return apiError("Invalid email or password", 401);

  if (!user.isActive) return apiError("Your account has been deactivated", 403);

  const { valid, needsRehash } = await verifyPassword(password, user.password);
  if (!valid) return apiError("Invalid email or password", 401);

  // Transparently migrate SHA256 → bcrypt on first successful login
  if (needsRehash) {
    await db
      .update(users)
      .set({ password: await hashPassword(password) })
      .where(eq(users.id, user.id));
  }

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.firstName = user.firstName;
  session.lastName = user.lastName;
  session.role = user.role;
  await session.save();

  return apiResponse({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  });
}
