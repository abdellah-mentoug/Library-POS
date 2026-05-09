"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/search-input";
import { useTranslations } from "@/lib/i18n/use-translations";

export function StockFilters() {
  const t = useTranslations("stock");
  const tc = useTranslations("common");
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const q = sp.get("q") ?? "";
  const low = sp.get("low") === "1";

  function pushWith(partial: Record<string, string | undefined>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(partial)) {
      if (v === undefined || v === "") p.delete(k);
      else p.set(k, v);
    }
    startTransition(() => {
      router.push(`/stock?${p.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        placeholder={t.searchPlaceholder}
        value={q}
        onChange={(value) => pushWith({ q: value || undefined })}
        className="max-w-sm"
      />
      <Button
        type="button"
        variant={low ? "default" : "outline"}
        size="sm"
        disabled={pending}
        onClick={() => pushWith({ low: low ? undefined : "1" })}
      >
        {t.lowStockToggle}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => startTransition(() => router.push("/stock"))}
      >
        {tc.clear}
      </Button>
    </div>
  );
}
