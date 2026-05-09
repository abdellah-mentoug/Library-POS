"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StockLevelBadgeProps {
  quantity: number;
  threshold: number;
  className?: string;
}

export function StockLevelBadge({ quantity, threshold, className }: StockLevelBadgeProps) {
  const variant =
    quantity <= 0 ? "destructive" : quantity <= threshold ? "secondary" : "default";
  const label =
    quantity <= 0 ? "0" : quantity <= threshold ? String(quantity) : String(quantity);

  return (
    <Badge
      variant={variant}
      className={cn(
        quantity <= 0 && "bg-red-600",
        quantity > 0 && quantity <= threshold && "bg-orange-500 text-white hover:bg-orange-500",
        quantity > threshold && "bg-green-600 hover:bg-green-600",
        className
      )}
    >
      {label}
    </Badge>
  );
}
