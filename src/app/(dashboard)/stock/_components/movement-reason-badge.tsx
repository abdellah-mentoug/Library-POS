"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const REASON_CLASS: Record<string, string> = {
  sale: "bg-red-100 text-red-800 border-red-300",
  sale_void: "bg-orange-100 text-orange-800 border-orange-300",
  purchase_received: "bg-green-100 text-green-800 border-green-300",
  entry: "bg-green-100 text-green-800 border-green-300",
  exit: "bg-red-100 text-red-800 border-red-300",
  stocktake: "bg-purple-100 text-purple-800 border-purple-300",
  adjustment_add: "bg-blue-100 text-blue-800 border-blue-300",
  adjustment_remove: "bg-yellow-100 text-yellow-900 border-yellow-300",
  damaged: "bg-gray-100 text-gray-800 border-gray-300",
  return: "bg-teal-100 text-teal-800 border-teal-300",
  initial: "bg-gray-100 text-gray-700 border-gray-200",
};

export function MovementReasonBadge({ reason }: { reason: string }) {
  return (
    <Badge variant="outline" className={cn("font-normal", REASON_CLASS[reason])}>
      {reason}
    </Badge>
  );
}
