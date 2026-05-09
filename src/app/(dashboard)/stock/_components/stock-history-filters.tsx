"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "@/lib/i18n/use-translations";

const REASONS = [
  "all",
  "sale",
  "sale_void",
  "purchase_received",
  "entry",
  "exit",
  "stocktake",
  "adjustment_add",
  "adjustment_remove",
  "return",
  "damaged",
  "initial",
] as const;

export function StockHistoryFilters() {
  const t = useTranslations("stockHistory");
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const reason = sp.get("reason") ?? "all";
  const start = sp.get("start") ?? "";
  const end = sp.get("end") ?? "";

  function push(partial: Record<string, string | undefined>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(partial)) {
      if (v === undefined || v === "") p.delete(k);
      else p.set(k, v);
    }
    startTransition(() => router.push(`/stock/history?${p.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1">
        <Label>{t.filterReason}</Label>
        <Select value={reason} onValueChange={(v) => push({ reason: v === "all" ? undefined : v })}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REASONS.map((r) => (
              <SelectItem key={r} value={r}>
                {r === "all" ? t.allReasons : r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>{t.startDate}</Label>
        <Input
          type="date"
          value={start}
          onChange={(e) => push({ start: e.target.value || undefined })}
        />
      </div>
      <div className="space-y-1">
        <Label>{t.endDate}</Label>
        <Input
          type="date"
          value={end}
          onChange={(e) => push({ end: e.target.value || undefined })}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(() => router.push("/stock/history"))}
      >
        {t.reset}
      </Button>
    </div>
  );
}
