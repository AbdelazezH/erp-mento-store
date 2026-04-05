import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "worker";
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "change-me-to-a-32-char-secret-key!!",
  cookieName: "nexus_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session.userId) throw new Error("Unauthorized");
  return {
    userId: session.userId,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    role: session.role,
  };
}

export async function requireAdmin(): Promise<SessionData> {
  const data = await requireSession();
  if (data.role !== "admin") throw new Error("Forbidden");
  return data;
}
