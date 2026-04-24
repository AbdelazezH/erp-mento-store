import { cookies } from "next/headers";

export type Locale = "en" | "ar";
export const defaultLocale: Locale = "ar";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value;
  return locale === "en" || locale === "ar" ? locale : defaultLocale;
}
