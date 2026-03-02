"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePrintOrderStatus } from "@/lib/actions/print-orders";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  registered: "Registered",
  in_progress: "In Progress",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

interface StatusUpdateDialogProps {
  orderId: string;
  currentStatus: string;
  newStatus: string;
  trigger: React.ReactNode;
}

export function StatusUpdateDialog({
  orderId,
  currentStatus,
  newStatus,
  trigger,
}: StatusUpdateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentLabel = STATUS_LABELS[currentStatus] ?? currentStatus;
  const newLabel = STATUS_LABELS[newStatus] ?? newStatus;

  function handleConfirm() {
    startTransition(async () => {
      try {
        const result = await updatePrintOrderStatus(
          orderId,
          newStatus as
            | "registered"
            | "in_progress"
            | "ready"
            | "delivered"
            | "cancelled"
        );

        if (result && "error" in result) {
          toast.error(String(result.error));
        } else {
          toast.success(`Status updated to ${newLabel}`);
          setOpen(false);
          router.refresh();
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update status"
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            Update status from <strong>{currentLabel}</strong> to{" "}
            <strong>{newLabel}</strong>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Updating..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
