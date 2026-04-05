import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, invitations } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { apiError, apiResponse } from "@/lib/utils";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

/** GET /api/users/invite/[token] — verify token (public, no auth required) */
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [invite] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.token, token), isNull(invitations.usedAt)));

  if (!invite) return apiError("Invitation not found or already used", 404);
  if (invite.expiresAt < new Date()) return apiError("Invitation has expired", 410);

  return apiResponse({ email: invite.email, role: invite.role, expiresAt: invite.expiresAt });
}

const acceptSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

/** POST /api/users/invite/[token] — accept invitation, create account, auto-login */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [invite] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.token, token), isNull(invitations.usedAt)));

  if (!invite) return apiError("Invitation not found or already used", 404);
  if (invite.expiresAt < new Date()) return apiError("Invitation has expired", 410);

  const body = await req.json().catch(() => null);
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400);

  const { firstName, lastName, password } = parsed.data;

  // Create the user
  const [newUser] = await db
    .insert(users)
    .values({
      email: invite.email,
      password: await hashPassword(password),
      firstName,
      lastName,
      role: invite.role,
      isActive: true,
    })
    .returning();

  // Mark invitation as used
  await db.update(invitations).set({ usedAt: new Date() }).where(eq(invitations.id, invite.id));

  // Auto-login
  const session = await getSession();
  session.userId = newUser.id;
  session.email = newUser.email;
  session.firstName = newUser.firstName;
  session.lastName = newUser.lastName;
  session.role = newUser.role;
  await session.save();

  return apiResponse({ ok: true, role: newUser.role });
}
