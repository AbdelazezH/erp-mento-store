import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.userId) redirect("/login");
  if (session.role !== "admin") redirect("/");
  return <>{children}</>;
}
