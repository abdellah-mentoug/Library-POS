"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/lib/i18n/use-translations";

function getDateStr(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

export function DateRangePicker() {
  const t = useTranslations("reports");
  const router = useRouter();
  const searchParams = useSearchParams();
  const start = searchParams.get("start") || getDateStr(30);
  const end = searchParams.get("end") || getDateStr(0);

  function applyRange(newStart: string, newEnd: string) {
    const params = new URLSearchParams();
    params.set("start", newStart);
    params.set("end", newEnd);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs">{t.start}</Label>
        <Input
          type="date"
          value={start}
          onChange={(e) => applyRange(e.target.value, end)}
          className="w-auto"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t.end}</Label>
        <Input
          type="date"
          value={end}
          onChange={(e) => applyRange(start, e.target.value)}
          className="w-auto"
        />
      </div>
      <div className="flex gap-1">
        {[
          { label: t.today, days: 0 },
          { label: t.days7, days: 7 },
          { label: t.days30, days: 30 },
          { label: t.days90, days: 90 },
        ].map((preset) => (
          <Button
            key={preset.days}
            variant="outline"
            size="sm"
            onClick={() =>
              applyRange(
                preset.days === 0 ? getDateStr(0) : getDateStr(preset.days),
                getDateStr(0)
              )
            }
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
