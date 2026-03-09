"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/lib/i18n/use-translations";

interface PrintOrderStatusBadgeProps {
  status: string;
}

export function PrintOrderStatusBadge({ status }: PrintOrderStatusBadgeProps) {
  const t = useTranslations("printOrders");
  const labels: Record<string, string> = {
    registered: t.registered,
    in_progress: t.inProgress,
    ready: t.ready,
    delivered: t.delivered,
    cancelled: t.cancelled,
  };
  const styles: Record<string, { variant: "default" | "destructive"; className: string }> = {
    registered: { variant: "default", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
    in_progress: { variant: "default", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
    ready: { variant: "default", className: "bg-green-100 text-green-800 hover:bg-green-100" },
    delivered: { variant: "default", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
    cancelled: { variant: "destructive", className: "" },
  };
  const config = styles[status] ?? { variant: "default" as const, className: "" };

  return (
    <Badge variant={config.variant} className={config.className}>
      {labels[status] || status}
    </Badge>
  );
}
