"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const presets = [
  { label: "Today", days: 0 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
];

function getDateStr(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

export function DateRangePicker() {
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
        <Label className="text-xs">Start</Label>
        <Input
          type="date"
          value={start}
          onChange={(e) => applyRange(e.target.value, end)}
          className="w-auto"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">End</Label>
        <Input
          type="date"
          value={end}
          onChange={(e) => applyRange(start, e.target.value)}
          className="w-auto"
        />
      </div>
      <div className="flex gap-1">
        {presets.map((preset) => (
          <Button
            key={preset.label}
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
