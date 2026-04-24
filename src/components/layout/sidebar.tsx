"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Truck,
  FileText,
  Users,
  ShoppingCart,
  Megaphone,
  Tag,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  KeyRound,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface SidebarProps {
  user: { firstName: string; lastName: string; email: string; role: string } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const t = useTranslations("nav");

  const navItems = [
    { href: "/", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/products", label: t("products"), icon: Package },
    { href: "/suppliers", label: t("suppliers"), icon: Truck },
    { href: "/bills", label: t("bills"), icon: FileText },
    { href: "/customers", label: t("customers"), icon: Users },
    { href: "/orders", label: t("orders"), icon: ShoppingCart },
    { href: "/campaigns", label: t("campaigns"), icon: Megaphone },
    { href: "/attributes", label: t("attributes"), icon: Tag },
  ];

  const settingsItems = [
    { href: "/settings/business", label: t("business"), icon: Settings },
    { href: "/settings/users", label: t("teamMembers"), icon: Users },
    { href: "/settings/cost-profiles", label: t("costProfiles"), icon: DollarSign },
    { href: "/settings/profile", label: t("myProfile"), icon: KeyRound },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-sidebar-foreground text-lg">Nexus ERP</span>
          </Link>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8 shrink-0", collapsed && "mx-auto")}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <>
              <ChevronRight className="h-4 w-4 ltr:block rtl:hidden" />
              <ChevronLeft className="h-4 w-4 ltr:hidden rtl:block" />
            </>
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 ltr:block rtl:hidden" />
              <ChevronRight className="h-4 w-4 ltr:hidden rtl:block" />
            </>
          )}
        </Button>
      </div>

      {/* Main Nav */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Settings section — admin only */}
        {user?.role === "admin" && (
          <div className={cn("mt-4 px-2", !collapsed && "border-t border-sidebar-border pt-4")}>
            {!collapsed && (
              <p className="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("settings")}
              </p>
            )}
            {settingsItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* Profile link for workers */}
        {user?.role === "worker" && (
          <div className="mt-4 px-2 border-t border-sidebar-border pt-4">
            <Link
              href="/settings/profile"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith("/settings/profile")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
              title={collapsed ? t("myProfile") : undefined}
            >
              <KeyRound className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t("myProfile")}</span>}
            </Link>
          </div>
        )}
      </ScrollArea>

      {/* User Footer */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className={cn("text-muted-foreground hover:text-foreground", !collapsed && "w-full justify-start")}
          onClick={handleLogout}
          title={collapsed ? t("logout") : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ms-2">{t("logout")}</span>}
        </Button>
      </div>
    </aside>
  );
}
