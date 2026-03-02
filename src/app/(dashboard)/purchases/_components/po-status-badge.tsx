"use client";

import { Badge } from "@/components/ui/badge";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive"; className?: string }
> = {
  draft: { label: "Draft", variant: "secondary" },
  ordered: { label: "Ordered", variant: "default", className: "bg-blue-100 text-blue-800" },
  partially_received: {
    label: "Partial",
    variant: "default",
    className: "bg-orange-100 text-orange-800",
  },
  received: { label: "Received", variant: "default", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export function POStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    variant: "secondary" as const,
  };
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
