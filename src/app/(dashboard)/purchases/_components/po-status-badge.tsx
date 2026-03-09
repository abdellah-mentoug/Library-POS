"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/lib/i18n/use-translations";

export function POStatusBadge({ status }: { status: string }) {
  const t = useTranslations("purchases");
  const labels: Record<string, string> = {
    draft: t.draft,
    ordered: t.ordered,
    partially_received: t.partial,
    received: t.received,
    cancelled: t.cancelled,
  };
  const statusConfig: Record<
    string,
    { variant: "default" | "secondary" | "destructive"; className?: string }
  > = {
    draft: { variant: "secondary" },
    ordered: { variant: "default", className: "bg-blue-100 text-blue-800" },
    partially_received: { variant: "default", className: "bg-orange-100 text-orange-800" },
    received: { variant: "default", className: "bg-green-100 text-green-800" },
    cancelled: { variant: "destructive" },
  };
  const config = statusConfig[status] || { variant: "secondary" as const };
  return (
    <Badge variant={config.variant} className={config.className}>
      {labels[status] || status}
    </Badge>
  );
}
