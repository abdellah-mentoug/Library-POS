"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "en" ? "fr" : "en")}
      className="flex items-center gap-1.5"
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-medium uppercase">
        {locale === "en" ? "FR" : "EN"}
      </span>
    </Button>
  );
}
