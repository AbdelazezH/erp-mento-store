"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/products": "Products",
  "/suppliers": "Suppliers",
  "/bills": "Bills & Expenses",
  "/customers": "Customers",
  "/orders": "Orders",
  "/campaigns": "Campaigns",
  "/attributes": "Attributes",
  "/settings/users": "Team Members",
  "/settings/profile": "My Profile",
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? pageTitles[Object.keys(pageTitles).find((k) => pathname.startsWith(k) && k !== "/") ?? ""] ?? "Nexus ERP";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
