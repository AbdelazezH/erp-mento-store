import { getSession } from "@/lib/auth/session";
import { apiResponse } from "@/lib/utils";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return apiResponse({ ok: true });
}
