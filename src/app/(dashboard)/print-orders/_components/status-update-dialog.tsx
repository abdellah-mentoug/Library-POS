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
import { useTranslations } from "@/lib/i18n/use-translations";
import { interpolate } from "@/lib/i18n/locales";

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
  const t = useTranslations("printOrders");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const STATUS_LABELS: Record<string, string> = {
    registered: t.registered,
    in_progress: t.inProgress,
    ready: t.ready,
    delivered: t.delivered,
    cancelled: t.cancelled,
  };
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
          toast.success(interpolate(t.statusUpdated, { status: newLabel }));
          setOpen(false);
          router.refresh();
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t.statusUpdateFailed
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.updateStatus}</DialogTitle>
          <DialogDescription>
            {interpolate(t.updateStatusConfirm, { from: currentLabel, to: newLabel })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            {tc.cancel}
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? tc.updating : tc.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
