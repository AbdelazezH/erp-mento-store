import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, invitations } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";
import { sendInviteEmail } from "@/lib/email";
import { eq, and, gt, isNull } from "drizzle-orm";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "worker"]).default("worker"),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return apiError("Forbidden", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { email, role } = parsed.data;

  // Check if email is already a registered user
  const [existingUser] = await db.select().from(users).where(eq(users.email, email));
  if (existingUser) return apiError("A user with this email already exists", 400);

  // Check for a pending (unused, non-expired) invitation
  const [pendingInvite] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email),
        isNull(invitations.usedAt),
        gt(invitations.expiresAt, new Date())
      )
    );

  if (pendingInvite) {
    return apiError("A pending invitation for this email already exists. It expires in 72 hours.", 400);
  }

  // Create invitation (72-hour expiry)
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  const [invitation] = await db
    .insert(invitations)
    .values({ email, role, invitedBy: session.userId, expiresAt })
    .returning();

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/accept-invite/${invitation.token}`;

  try {
    await sendInviteEmail({
      to: email,
      inviterName: `${session.firstName} ${session.lastName}`,
      inviteUrl,
      role,
    });
  } catch (err) {
    console.error("Failed to send invite email:", err);
    // Don't fail the request — return the invite link so admin can share manually
    return apiResponse({ ...invitation, inviteUrl, emailSent: false }, 201);
  }

  return apiResponse({ ...invitation, inviteUrl, emailSent: true }, 201);
}
