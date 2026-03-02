"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePurchaseOrderStatus } from "@/lib/actions/purchases";
import { Button } from "@/components/ui/button";
import { Package, XCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface POActionsProps {
  poId: string;
  status: string;
}

export function POActions({ poId, status }: POActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatusUpdate(newStatus: "ordered" | "cancelled") {
    startTransition(async () => {
      const result = await updatePurchaseOrderStatus(poId, newStatus);
      if (result && "error" in result && result.error) {
        toast.error(result.error as string);
      } else {
        toast.success(
          newStatus === "ordered"
            ? "Order marked as ordered"
            : "Order cancelled"
        );
        router.refresh();
      }
    });
  }

  if (status === "received" || status === "cancelled") {
    return null;
  }

  return (
    <div className="flex gap-2">
      {status === "draft" && (
        <Button
          onClick={() => handleStatusUpdate("ordered")}
          disabled={isPending}
        >
          <Truck className="mr-2 h-4 w-4" />
          {isPending ? "Updating..." : "Mark as Ordered"}
        </Button>
      )}

      {(status === "ordered" || status === "partially_received") && (
        <Button asChild>
          <Link href={`/purchases/${poId}/receive`}>
            <Package className="mr-2 h-4 w-4" />
            Receive Stock
          </Link>
        </Button>
      )}

      {status !== "received" && status !== "cancelled" && (
        <Button
          variant="destructive"
          onClick={() => handleStatusUpdate("cancelled")}
          disabled={isPending}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Cancel Order
        </Button>
      )}
    </div>
  );
}
