"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { voidSale } from "@/lib/actions/sales";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface VoidSaleDialogProps {
  saleId: string;
  saleNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoidSaleDialog({
  saleId,
  saleNumber,
  open,
  onOpenChange,
}: VoidSaleDialogProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleVoid() {
    if (!reason.trim()) return;

    startTransition(async () => {
      try {
        await voidSale(saleId, reason);
        toast.success(`Sale ${saleNumber} voided`);
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to void sale"
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Void Sale {saleNumber}</DialogTitle>
          <DialogDescription>
            This will mark the sale as voided and restore all stock quantities.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for voiding *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for voiding this sale..."
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={isPending || !reason.trim()}
            >
              {isPending ? "Voiding..." : "Void Sale"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
