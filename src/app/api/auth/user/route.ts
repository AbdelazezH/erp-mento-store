import { getSession } from "@/lib/auth/session";
import { apiError, apiResponse } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  if (!session.userId) return apiError("Unauthorized", 401);
  return apiResponse({
    id: session.userId,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    role: session.role,
  });
}
