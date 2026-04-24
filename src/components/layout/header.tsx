"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";

export function Header() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const pageTitles: Record<string, string> = {
    "/": t("dashboard"),
    "/products": t("products"),
    "/suppliers": t("suppliers"),
    "/bills": t("billsExpenses"),
    "/customers": t("customers"),
    "/orders": t("orders"),
    "/campaigns": t("campaigns"),
    "/attributes": t("attributes"),
    "/settings/users": t("teamMembers"),
    "/settings/profile": t("myProfile"),
  };

  const title =
    pageTitles[pathname] ??
    pageTitles[
      Object.keys(pageTitles).find((k) => pathname.startsWith(k) && k !== "/") ?? ""
    ] ??
    "Nexus ERP";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
