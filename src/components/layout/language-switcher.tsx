"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const toggle = () => {
    const next = locale === "en" ? "ar" : "en";
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="font-medium">
      {locale === "en" ? "عربي" : "EN"}
    </Button>
  );
}
